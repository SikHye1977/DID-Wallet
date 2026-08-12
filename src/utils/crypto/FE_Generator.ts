import {NativeModules} from 'react-native';
import {Buffer} from 'buffer';
import CryptoJS from 'crypto-js';

// 네이티브 모듈 import
const {BCHModule} = NativeModules;

const SEED_LEN = 16;

export async function Generator(faceBinaryString: string) {
  try {
    // [LOG 2-1] 이진화 입력값 확인
    console.log('====================================');
    console.log('✅ [CHECK 2-1] Fuzzy Extractor 입력');
    console.log(' - Binarized Bit String Length:', faceBinaryString.length); // 256 이어야 함
    console.log(
      ' - Binarized Bit Sample:',
      faceBinaryString.substring(0, 32) + '...',
    );

    const w = binaryStringToBuffer(faceBinaryString);
    const w_hex = w.toString('hex');

    const s_raw = await Secure_Sketch(w_hex);
    const s_array = typeof s_raw === 'string' ? JSON.parse(s_raw) : s_raw;

    const {x_hex, R} = Strong_Randomness_Extractor(w);

    const s_hex = s_array
      .map((num: number) => num.toString(16).padStart(2, '0'))
      .join('');
    const P = s_hex + '||' + x_hex;

    // [LOG 2-2] 최종 Key(R) 및 HelperData(P) 확인
    console.log('✅ [CHECK 2-2] FE Generator 완료');
    console.log(' - Syndrome Count:', s_array.length);
    console.log(' - HelperData (P):', P);
    console.log(' - Key (R) Hex:', R);
    console.log(' - Key (R) Bit Length:', R.length * 4); // 64자리 Hex = 256 bits
    console.log('====================================');

    return {
      helperData: P,
      key: R,
    };
  } catch (e) {
    console.error('[Gen] 생성 실패:', e);
    throw e;
  }
}

export async function Secure_Sketch(w_hex: string): Promise<string> {
  return await BCHModule.generateSyndrome(w_hex);
}

export function Strong_Randomness_Extractor(w: Buffer) {
  const x_wordArray = CryptoJS.lib.WordArray.random(SEED_LEN);
  const x_hex = x_wordArray.toString(CryptoJS.enc.Hex);

  const w_hex = w.toString('hex');
  const R = CryptoJS.HmacSHA256(w_hex, x_hex).toString();

  return {x_hex, R};
}

const binaryStringToBuffer = (str: string): Buffer => {
  // 패딩 추가
  const paddedStr = str.padStart(255, '0');

  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      const bitIdx = i * 8 + j;
      if (bitIdx < 255) {
        if (paddedStr[bitIdx] === '1') {
          byte |= 1 << (7 - j);
        }
      }
    }
    bytes[i] = byte;
  }
  return Buffer.from(bytes);
};
