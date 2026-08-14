cmake_minimum_required(VERSION 3.22.1)

project(appmodules)

# ============================================================
# React Native New Architecture
# ============================================================

include(
    ${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake
)

# ============================================================
# DID Wallet Native Crypto
# ============================================================
#
# NativeCryptoJni.cpp는 현재 cpp 루트에 있기 때문에
# ReactNative-application.cmake에 의해 appmodules에 이미 포함된다.
#
# BCH 구현 본체만 appmodules에 추가한다.
#

target_sources(
    ${CMAKE_PROJECT_NAME}
    PRIVATE

    BCH/BCH.cpp
)

target_include_directories(
    ${CMAKE_PROJECT_NAME}
    PRIVATE

    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/BCH
)

target_compile_features(
    ${CMAKE_PROJECT_NAME}
    PRIVATE
    cxx_std_20
)

set_source_files_properties(
    BCH/BCH.cpp
    PROPERTIES
    COMPILE_OPTIONS "-Wno-error=unused-private-field"
)