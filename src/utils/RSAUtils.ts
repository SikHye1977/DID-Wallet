import {RSA} from 'react-native-rsa-native';

export type RSAKeyPair = {
  publicKey: string;
  privateKey: string;
};

/**
 * iOS/Android 네이티브 백그라운드 쓰레드에서 2048비트 RSA 키 쌍을 생성합니다.
 * (JS 쓰레드가 블로킹되지 않음)
 */
export async function generateNativeRSAKeyPair(): Promise<RSAKeyPair> {
  try {
    const keys = await RSA.generateKeys(2048);
    return {
      publicKey: keys.public,
      privateKey: keys.private,
    };
  } catch (error) {
    console.error('[RSA Native Error]', error);
    throw new Error('네이티브 RSA 키 생성에 실패했습니다.');
  }
}
