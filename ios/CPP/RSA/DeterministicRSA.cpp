//
//  DeterministicRSA.cpp
//  Wallet
//
//  Created by 한승훈 on 8/5/26.
//

#include "DeterministicRSA.hpp"

#include <openssl/rsa.h>
#include <openssl/pem.h>
#include <openssl/rand.h>
#include <openssl/evp.h>
#include <openssl/bn.h>

#include <vector>
#include <string>
#include <sstream>
#include <iomanip>
#include <cstring>
#include <algorithm>
#include <stdexcept>

// 1. Hex 문자열 -> Byte 배열 변환
static std::vector<uint8_t> hexToBytes(const std::string& hex) {
    std::vector<uint8_t> bytes;
    for (size_t i = 0; i < hex.length(); i += 2) {
        std::string byteString = hex.substr(i, 2);
        uint8_t byte = static_cast<uint8_t>(strtol(byteString.c_str(), nullptr, 16));
        bytes.push_back(byte);
    }
    return bytes;
}

// 2. Byte 배열 -> Hex 문자열 변환
static std::string bytesToHex(const uint8_t* data, size_t len) {
    std::stringstream ss;
    ss << std::hex << std::setfill('0');
    for (size_t i = 0; i < len; ++i) {
        ss << std::setw(2) << static_cast<int>(data[i]);
    }
    return ss.str();
}

// 3. SHA-256 Counter 기반 결정론적 난수 생성기 (DRBG)
class DeterministicDRBG {
private:
    std::vector<uint8_t> seed_;
    uint64_t counter_;

public:
    DeterministicDRBG() : counter_(0) {}

    void init(const uint8_t* seed_data, size_t seed_len) {
        seed_.assign(seed_data, seed_data + seed_len);
        counter_ = 0;
    }

    void getBytes(uint8_t* out, size_t num_bytes) {
        size_t generated = 0;
        while (generated < num_bytes) {
            EVP_MD_CTX* ctx = EVP_MD_CTX_new();
            EVP_DigestInit_ex(ctx, EVP_sha256(), nullptr);
            EVP_DigestUpdate(ctx, seed_.data(), seed_.size());
            EVP_DigestUpdate(ctx, &counter_, sizeof(counter_));

            uint8_t hash[32];
            unsigned int len = 0;
            EVP_DigestFinal_ex(ctx, hash, &len);
            EVP_MD_CTX_free(ctx);

            size_t to_copy = std::min(static_cast<size_t>(len), num_bytes - generated);
            std::memcpy(out + generated, hash, to_copy);

            generated += to_copy;
            counter_++;
        }
    }
};

static thread_local DeterministicDRBG g_drbg;

static int custom_rand_bytes(unsigned char *buf, int num) {
    if (num < 0) return 0;
    g_drbg.getBytes(reinterpret_cast<uint8_t*>(buf), static_cast<size_t>(num));
    return 1;
}

static int custom_rand_status() { return 1; }

static RAND_METHOD g_custom_rand_method = {
    nullptr,              // seed
    custom_rand_bytes,    // bytes
    nullptr,              // cleanup
    nullptr,              // add
    custom_rand_bytes,    // pseudorand
    custom_rand_status    // status
};

// 4. 메인 결정론적 RSA 생성 함수
DeterministicRSAResult generateDeterministicRSA(const std::string& seedHex) {
    std::vector<uint8_t> seedBytes;
    if (seedHex.length() == 64) {
        seedBytes = hexToBytes(seedHex);
    } else {
        seedBytes.assign(seedHex.begin(), seedHex.end());
    }

    // A. DRBG 초기화
    g_drbg.init(seedBytes.data(), seedBytes.size());

    // B. OpenSSL 난수 엔진을 커스텀 DRBG로 교체
    const RAND_METHOD* old_method = RAND_get_rand_method();
    RAND_set_rand_method(&g_custom_rand_method);

    BIGNUM* e = BN_new();
    BN_set_word(e, RSA_F4); // 65537
    RSA* rsa = RSA_new();

    // C. 키 쌍 생성
    int success = RSA_generate_key_ex(rsa, 2048, e, nullptr);

    std::string pubKeyPem;
    std::string fingerprintHex;

    if (success == 1) {
        // D. Public Key -> PEM 문자열 추출
        BIO* pubBio = BIO_new(BIO_s_mem());
        PEM_write_bio_RSA_PUBKEY(pubBio, rsa);
        char* pubData = nullptr;
        long pubLen = BIO_get_mem_data(pubBio, &pubData);
        pubKeyPem = std::string(pubData, pubLen);
        BIO_free(pubBio);

        // E. Fingerprint (SHA-256) 생성
        unsigned char hash[32];
        EVP_MD_CTX* mdctx = EVP_MD_CTX_new();
        EVP_DigestInit_ex(mdctx, EVP_sha256(), nullptr);
        EVP_DigestUpdate(mdctx, pubKeyPem.data(), pubKeyPem.size());
        unsigned int mdLen = 0;
        EVP_DigestFinal_ex(mdctx, hash, &mdLen);
        EVP_MD_CTX_free(mdctx);

        fingerprintHex = bytesToHex(hash, mdLen);
    }

    // F. 자원 해제 및 기존 RAND_METHOD 원복
    RSA_free(rsa);
    BN_free(e);

    if (old_method) {
        RAND_set_rand_method(old_method);
    } else {
        RAND_set_rand_method(RAND_OpenSSL());
    }

    if (success != 1) {
        throw std::runtime_error("OpenSSL 결정론적 RSA 키 생성에 실패했습니다.");
    }

    return { pubKeyPem, fingerprintHex };
}
