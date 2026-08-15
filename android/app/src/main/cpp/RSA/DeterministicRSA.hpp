//
//  DeterministicRSA.hpp
//  Wallet
//
//  Created by 한승훈 on 8/5/26.
//

#ifndef DeterministicRSA_hpp
#define DeterministicRSA_hpp

#include <string>

struct DeterministicRSAResult {
    std::string publicKeyPem;
    std::string fingerprintHex;
};

/**
 * feKeyHex(256-bit Hex)를 Seed로 입력받아
 * OpenSSL 기반의 결정론적 RSA-2048 공개키 및 Fingerprint를 생성합니다.
 */
DeterministicRSAResult generateDeterministicRSA(const std::string& seedHex);

#endif /* DeterministicRSA_hpp */
