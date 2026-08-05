//
//  DeterministicRSAModule.m
//  Wallet
//
//  Created by 한승훈 on 8/5/26.
//

#import "DeterministicRSAModule.h"
#import "DeterministicRSA.hpp"

@implementation DeterministicRSAModule

RCT_EXPORT_MODULE(DeterministicRSAModule);

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

// 🚀 백그라운드 직렬 큐 지정 (JS 및 Main UI Thread 블로킹 방지)
- (dispatch_queue_t)methodQueue
{
  static dispatch_queue_t queue;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    queue = dispatch_queue_create("com.uxmwallet.deterministic-rsa", DISPATCH_QUEUE_SERIAL);
  });
  return queue;
}

RCT_REMAP_METHOD(
  generatePublicKey,
  generatePublicKeyWithSeedHex:(NSString *)seedHex
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
) {
  @autoreleasepool {
    try {
      std::string nativeSeed = seedHex.UTF8String != nullptr ? std::string(seedHex.UTF8String) : std::string();

      auto result = generateDeterministicRSA(nativeSeed);

      resolve(@{
        @"publicKey": [NSString stringWithUTF8String:result.publicKeyPem.c_str()],
        @"fingerprint": [NSString stringWithUTF8String:result.fingerprintHex.c_str()],
        @"algorithm": @"RSA-2048-OpenSSL-SHA256-DRBG-V1"
      });
    } catch (const std::exception& error) {
      reject(
        @"RSA_GENERATION_FAILED",
        [NSString stringWithUTF8String:error.what()],
        nil
      );
    }
  }
}

@end
