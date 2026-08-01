import forge from 'node-forge';
import CryptoJS from 'crypto-js';

/**
 * 1. Seed(R) 기반의 결정론적 난수 생성기 (Custom PRNG)
 * 입력된 시드가 같으면 언제나 100% 동일한 바이트 스트림을 반환합니다.
 */
function createDeterministicPRNG(seedHex: string) {
  let counter = 0;
  return {
    getBytesSync: function (size: number) {
      let output = '';
      while (output.length < size) {
        // 시드와 카운터를 조합해 해시 생성
        const hash = CryptoJS.SHA256(seedHex + counter.toString());
        const hexStr = hash.toString(CryptoJS.enc.Hex);

        // node-forge가 요구하는 binary string 형태로 변환
        for (let i = 0; i < hexStr.length; i += 2) {
          output += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
          if (output.length >= size) break;
        }
        counter++;
      }
      return output;
    },
  };
}

/**
 * 2. Seed(R)를 이용해 항상 동일한 RSA 키 쌍을 생성하는 함수
 */
export function generateDeterministicRSA(seedKeyR: string) {
  console.log('결정론적 RSA 키 생성 시작...');

  // 우리가 만든 Seed 기반 난수 생성기 주입
  const prng = createDeterministicPRNG(seedKeyR);

  // RSA 키 쌍 생성 (prng 옵션으로 난수 생성기를 덮어씌움)
  const keypair = forge.pki.rsa.generateKeyPair({
    bits: 2048,
    e: 0x10001,
    prng: prng,
  });

  // 사용하기 편한 PEM(문자열) 형식으로 변환
  const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
  const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);

  console.log('결정론적 RSA 키 생성 완료!');

  return {
    publicKey: publicKeyPem,
    privateKey: privateKeyPem, // 매번 동일한 개인키가 나옴 (저장할 필요 없이 런타임에 복구 가능)
  };
}
