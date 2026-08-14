#include <jni.h>

#include <iomanip>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

#include "BCH/BCH.hpp"


static std::string jstringToString(
    JNIEnv* env,
    jstring value
) {
    if (value == nullptr) {
        return "";
    }

    const char* chars =
        env->GetStringUTFChars(
            value,
            nullptr
        );

    if (chars == nullptr) {
        throw std::runtime_error(
            "Java String 변환에 실패했습니다."
        );
    }

    std::string result(chars);

    env->ReleaseStringUTFChars(
        value,
        chars
    );

    return result;
}


static std::vector<unsigned char> hexToBytes(
    const std::string& hex
) {
    if (hex.empty()) {
        throw std::runtime_error(
            "입력 Hex 문자열이 비어 있습니다."
        );
    }

    if (hex.length() % 2 != 0) {
        throw std::runtime_error(
            "Hex 문자열 길이가 올바르지 않습니다."
        );
    }

    std::vector<unsigned char> bytes;
    bytes.reserve(hex.length() / 2);

    try {
        for (
            std::size_t i = 0;
            i < hex.length();
            i += 2
        ) {
            const std::string byteString =
                hex.substr(i, 2);

            const auto byte =
                static_cast<unsigned char>(
                    std::stoul(
                        byteString,
                        nullptr,
                        16
                    )
                );

            bytes.push_back(byte);
        }
    } catch (...) {
        throw std::runtime_error(
            "유효하지 않은 Hex 문자열입니다."
        );
    }

    return bytes;
}


static std::string bytesToHex(
    const std::vector<unsigned char>& bytes
) {
    std::stringstream ss;

    ss << std::hex
       << std::setfill('0');

    for (const auto byte : bytes) {
        ss << std::setw(2)
           << static_cast<int>(byte);
    }

    return ss.str();
}


static void throwJavaException(
    JNIEnv* env,
    const std::string& message
) {
    jclass exceptionClass =
        env->FindClass(
            "java/lang/RuntimeException"
        );

    if (exceptionClass != nullptr) {
        env->ThrowNew(
            exceptionClass,
            message.c_str()
        );
    }
}


/**
 * Kotlin:
 *
 * BCHModule.nativeGenerateSyndrome(hexW)
 */
extern "C"
JNIEXPORT jintArray JNICALL
Java_com_wallet_nativecrypto_BCHModule_nativeGenerateSyndrome(
    JNIEnv* env,
    jobject,
    jstring hexW
) {
    try {
        const std::string hex =
            jstringToString(
                env,
                hexW
            );

        const std::vector<unsigned char> input =
            hexToBytes(hex);

        BCH bch(8);

        const std::vector<int> syndrome =
            bch.compute_syndrome(input);

        jintArray result =
            env->NewIntArray(
                static_cast<jsize>(
                    syndrome.size()
                )
            );

        if (result == nullptr) {
            throw std::runtime_error(
                "JNI IntArray 생성에 실패했습니다."
            );
        }

        std::vector<jint> temp(
            syndrome.begin(),
            syndrome.end()
        );

        env->SetIntArrayRegion(
            result,
            0,
            static_cast<jsize>(
                temp.size()
            ),
            temp.data()
        );

        return result;

    } catch (const std::exception& e) {
        throwJavaException(
            env,
            e.what()
        );

        return nullptr;
    }
}


/**
 * Kotlin:
 *
 * BCHModule.nativeRecover(
 *   hexWPrime,
 *   syndrome
 * )
 */
extern "C"
JNIEXPORT jstring JNICALL
Java_com_wallet_nativecrypto_BCHModule_nativeRecover(
    JNIEnv* env,
    jobject,
    jstring hexWPrime,
    jintArray savedSyndromes
) {
    try {
        const std::string hex =
            jstringToString(
                env,
                hexWPrime
            );

        const std::vector<unsigned char> noisyData =
            hexToBytes(hex);

        if (savedSyndromes == nullptr) {
            throw std::runtime_error(
                "Syndrome 배열이 없습니다."
            );
        }

        const jsize size =
            env->GetArrayLength(
                savedSyndromes
            );

        std::vector<jint> temp(size);

        env->GetIntArrayRegion(
            savedSyndromes,
            0,
            size,
            temp.data()
        );

        std::vector<int> syndrome;
        syndrome.reserve(size);

        for (const auto value : temp) {
            syndrome.push_back(
                static_cast<int>(value)
            );
        }

        BCH bch(8);

        const std::vector<unsigned char> recovered =
            bch.recover(
                noisyData,
                syndrome
            );

        const std::string recoveredHex =
            bytesToHex(recovered);

        return env->NewStringUTF(
            recoveredHex.c_str()
        );

    } catch (const std::exception& e) {
        throwJavaException(
            env,
            e.what()
        );

        return nullptr;
    }
}