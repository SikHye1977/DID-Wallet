package com.wallet.nativecrypto

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class BCHModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "BCHModule"
    }

    @ReactMethod
    fun generateSyndrome(
        hexW: String,
        promise: Promise
    ) {
        try {
            val result =
                nativeGenerateSyndrome(hexW)

            val array =
                Arguments.createArray()

            result.forEach { value ->
                array.pushInt(value)
            }

            promise.resolve(array)
        } catch (e: Throwable) {
            promise.reject(
                "BCH_GENERATE_ERROR",
                e.message ?: "BCH syndrome 생성 실패",
                e
            )
        }
    }

    @ReactMethod
    fun recover(
        hexWPrime: String,
        savedSyndromes: ReadableArray,
        promise: Promise
    ) {
        try {
            val syndromes =
                IntArray(
                    savedSyndromes.size()
                ) { index ->
                    savedSyndromes.getInt(index)
                }

            val result =
                nativeRecover(
                    hexWPrime,
                    syndromes
                )

            promise.resolve(result)
        } catch (e: Throwable) {
            promise.reject(
                "BCH_RECOVER_ERROR",
                e.message ?: "BCH 복구 실패",
                e
            )
        }
    }

    private external fun nativeGenerateSyndrome(
        hexW: String
    ): IntArray

    private external fun nativeRecover(
        hexWPrime: String,
        savedSyndromes: IntArray
    ): String
}