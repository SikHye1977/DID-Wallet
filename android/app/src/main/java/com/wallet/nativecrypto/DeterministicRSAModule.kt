package com.wallet.nativecrypto

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DeterministicRSAModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "DeterministicRSAModule"
    }

    @ReactMethod
    fun generatePublicKey(
        seedHex: String,
        promise: Promise
    ) {
        try {
            val normalizedSeed =
                seedHex
                    .trim()
                    .lowercase()

            if (
                !normalizedSeed.matches(
                    Regex("^[0-9a-f]{64}$")
                )
            ) {
                throw IllegalArgumentException(
                    "FE key는 64자리의 256-bit Hex 문자열이어야 합니다."
                )
            }

            val result =
                nativeGeneratePublicKey(
                    normalizedSeed
                )

            if (result.size != 2) {
                throw IllegalStateException(
                    "RSA Native 결과 형식이 올바르지 않습니다."
                )
            }

            val response =
                Arguments.createMap()

            response.putString(
                "publicKey",
                result[0]
            )

            response.putString(
                "fingerprint",
                result[1]
            )

            response.putString(
                "algorithm",
                "RSA-2048-OpenSSL-SHA256-DRBG-V1"
            )

            promise.resolve(
                response
            )

        } catch (e: Throwable) {
            promise.reject(
                "DETERMINISTIC_RSA_ERROR",
                e.message
                    ?: "결정론적 RSA 공개키 생성 실패",
                e
            )
        }
    }

    private external fun nativeGeneratePublicKey(
        seedHex: String
    ): Array<String>
}