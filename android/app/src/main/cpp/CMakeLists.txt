cmake_minimum_required(VERSION 3.22.1)

project(appmodules)

# ============================================================
# React Native New Architecture
# ============================================================

include(
    ${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake
)

# ============================================================
# OpenSSL
# ============================================================

set(
    OPENSSL_ROOT
    ${CMAKE_CURRENT_SOURCE_DIR}/openssl/${ANDROID_ABI}
)

add_library(
    openssl_crypto
    STATIC
    IMPORTED
)

set_target_properties(
    openssl_crypto
    PROPERTIES
    IMPORTED_LOCATION
        ${OPENSSL_ROOT}/lib/libcrypto.a
    INTERFACE_INCLUDE_DIRECTORIES
        ${OPENSSL_ROOT}/include
)

# ============================================================
# DID Wallet Native Crypto
# ============================================================

target_sources(
    ${CMAKE_PROJECT_NAME}
    PRIVATE

    BCH/BCH.cpp
    RSA/DeterministicRSA.cpp
)

target_include_directories(
    ${CMAKE_PROJECT_NAME}
    PRIVATE

    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/BCH
    ${CMAKE_CURRENT_SOURCE_DIR}/RSA
    ${OPENSSL_ROOT}/include
)

target_compile_features(
    ${CMAKE_PROJECT_NAME}
    PRIVATE
    cxx_std_20
)

# ============================================================
# Warning handling
# ============================================================

set_source_files_properties(
    BCH/BCH.cpp
    PROPERTIES
    COMPILE_OPTIONS "-Wno-error=unused-private-field"
)

set_source_files_properties(
    RSA/DeterministicRSA.cpp
    PROPERTIES
    COMPILE_OPTIONS "-Wno-error=deprecated-declarations"
)

# ============================================================
# Native libraries
# ============================================================
#
# ReactNative-application.cmake가 appmodules에 대해
# target_link_libraries의 plain signature를 사용하므로
# 여기에서도 PRIVATE/PUBLIC/INTERFACE를 사용하지 않는다.
#

target_link_libraries(
    ${CMAKE_PROJECT_NAME}
    openssl_crypto
    dl
)