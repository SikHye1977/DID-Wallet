import {NativeModules} from 'react-native';

const {DeterministicRSAModule} = NativeModules;

export type DeterministicRSAResult = {
  publicKey: string;
  fingerprint: string;
  algorithm: string;
};

function normalizeSeedHex(seedHex: string): string {
  const normalized = seedHex.trim().toLowerCase();

  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error('FE key는 64자리의 256-bit Hex 문자열이어야 합니다.');
  }

  return normalized;
}

export async function generateDeterministicRSAKeyPair(
  feKeyHex: string,
): Promise<DeterministicRSAResult> {
  if (
    !DeterministicRSAModule ||
    typeof DeterministicRSAModule.generatePublicKey !== 'function'
  ) {
    throw new Error(
      'DeterministicRSAModule이 연결되지 않았습니다. iOS 앱을 다시 빌드해주세요.',
    );
  }

  const normalizedSeed = normalizeSeedHex(feKeyHex);

  return DeterministicRSAModule.generatePublicKey(normalizedSeed);
}
