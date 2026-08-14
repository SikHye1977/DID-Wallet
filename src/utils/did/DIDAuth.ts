// import axios from 'axios';
// import nacl from 'tweetnacl';
// import bs58 from 'bs58';
// import * as ed2curve from 'ed2curve';
// import {Buffer} from 'buffer';
// import {ISSUER_INNER_PRIVATE_X25519_KEY, MEDIATOR_URL} from '@env';
// import {getItem} from '../storage/AsyncStorage';
// import {ISSUER_BACKEND_URL, ISSUER_INNER_PUBLIC_X25519_KEY} from '@env';

// // 25.03.05 Mediator에 토큰 등록
// export async function regist_token(did: string, token: string) {
//   const url = `https://${MEDIATOR_URL}/message/regist-token`;

//   const requestBody = {
//     DID: did,
//     token: token,
//   };

//   try {
//     const response = await axios.post(url, requestBody);
//     console.log('서버 응답:', response.data);
//     return response.data;
//   } catch (error) {
//     console.error('DID 인증 실패:', error);
//     return null; // 오류가 발생했을 때 null 반환
//   }
// }

// // Issuer-Back으로부터 Challenge를 전달받기 위한 함수
// export async function get_challenge(
//   authRequestId: string,
//   did: string,
//   deviceToken: string,
// ) {
//   const url = `https://${ISSUER_BACKEND_URL}/indy/api/v1/did-auth/challenge`; // HTTPS 사용

//   const requestBody = {authRequestId, did, deviceToken};

//   // Andorid log
//   console.log('========== [DID Auth Challenge Request] ==========');
//   console.log('URL:', url);
//   console.log('authRequestId:', authRequestId);
//   console.log('did:', did);
//   console.log('deviceToken exists:', !!deviceToken);
//   console.log('deviceToken length:', deviceToken?.length);
//   console.log(
//     'deviceToken preview:',
//     deviceToken
//       ? `${deviceToken.slice(0, 10)}...${deviceToken.slice(-6)}`
//       : 'EMPTY',
//   );
//   console.log('==================================================');
//   // Android log 

//   try {
//     const response = await axios.post(url, requestBody);
//     console.log(deviceToken);
//     console.log('서버 응답:', response.data);
//     return response.data.challenge;
//   } catch (error: any) {
//     console.log('❌ Status Code:', error.response?.status);
//     console.log('❌ Server Data:', error.response?.data);
//     console.log('❌ Error Message:', error.message);
//     if (error.response) {
//       console.error('서버 오류:', error.response.data);
//     } else if (error.request) {
//       console.error(
//         '요청이 전송되지 않음 (네트워크 오류 가능):',
//         error.request,
//       );
//     } else {
//       console.error('Challenge 생성 중 알 수 없는 오류 발생:', error.message);
//     }
//     return null;
//   }
// }

// // 25.03.19
// // Challenge 복호화 함수
// export async function decrypt_challenge(
//   encryptedChallengeBase58: string,
//   holderXSecretKey: string, // <--- 1️⃣ 비밀키를 외부에서 받도록 추가
// ) {
//   try {
//     console.log(
//       `🔑 [Wallet] Received Encrypted Challenge: ${encryptedChallengeBase58}`,
//     );

//     // ❌ 삭제 또는 주석 처리 (AsyncStorage에서 가져오는 부분)
//     // let holderxprivatekeyBase58 = await getItem('xSecretkey');

//     // ✅ 변경: 전달받은 파라미터 사용
//     let holderxprivatekeyBase58 = holderXSecretKey;

//     if (!holderxprivatekeyBase58) {
//       throw new Error('❌ Holder X25519 Private Key not provided!');
//     }
//     let holderxprivatekey = bs58.decode(holderxprivatekeyBase58);
//     // 2️⃣ Issuer의 X25519 Public Key 가져오기
//     const issuerX25519PublicKeyBase58 = ISSUER_INNER_PUBLIC_X25519_KEY;
//     if (!issuerX25519PublicKeyBase58) {
//       throw new Error('❌ Issuer X25519 Public Key not found!');
//     }
//     const issuerX25519PublicKey = bs58.decode(issuerX25519PublicKeyBase58);
//     if (issuerX25519PublicKey.length !== 32) {
//       throw new Error(
//         `❌ Invalid Issuer X25519 Public Key Length: ${issuerX25519PublicKey.length}`,
//       );
//     }
//     console.log(
//       `📢 Issuer X25519 Public Key (Decoded): ${issuerX25519PublicKey}`,
//     );

//     // 3️⃣ Base58 디코딩 (Nonce + CipherText)
//     const combinedData = bs58.decode(encryptedChallengeBase58);
//     if (combinedData.length < 24) {
//       throw new Error('❌ Invalid Encrypted Challenge Data (Too Short)');
//     }

//     // 4️⃣ Nonce (24바이트) + 암호화된 Challenge 분리
//     const nonce = combinedData.slice(0, 24);
//     const encryptedChallenge = combinedData.slice(24);
//     console.log(`📢 Extracted Nonce (Base58): ${bs58.encode(nonce)}`);
//     console.log(
//       `📩 Extracted Encrypted Challenge (Base58): ${bs58.encode(
//         encryptedChallenge,
//       )}`,
//     );

//     // 5️⃣ Challenge 복호화 (NaCl `box.open`)
//     const decryptedChallenge = nacl.box.open(
//       encryptedChallenge,
//       nonce,
//       issuerX25519PublicKey,
//       holderxprivatekey,
//     );

//     if (!decryptedChallenge) {
//       console.error('❌ Challenge 복호화 실패!');
//       return null;
//     }

//     // 6️⃣ Base58로 Challenge 인코딩 후 반환
//     const decryptedChallengeBase58 = bs58.encode(decryptedChallenge);
//     console.log(
//       `✅ [Wallet] Decrypted Challenge (Base58): ${decryptedChallengeBase58}`,
//     );

//     return decryptedChallengeBase58;
//   } catch (error) {
//     console.error('❌ Challenge 복호화 중 오류 발생:', error);
//     return null;
//   }
// }

// // 25.03.19
// // challenge 검증
// // 25.03.27
// // authRequestId 파라미터 추가
// export async function verify_challenge(
//   authRequestId: string,
//   did: string,
//   decryptedChallenge: string,
// ): Promise<boolean> {
//   try {
//     const url = `https://${ISSUER_BACKEND_URL}/indy/api/v1/did-auth/verify`;

//     const requestBody = {authRequestId, did, decryptedChallenge};

//     console.log(
//       `🔎 [Wallet] Sending challenge verification request:`,
//       requestBody,
//     );

//     const response = await axios.post(url, requestBody);

//     if (response.status === 201) {
//       console.log(`✅ [Wallet] DID Authentication successful for ${did}`);
//       return true;
//     } else {
//       console.warn(`❌ [Wallet] DID Authentication failed for ${did}`);
//       return false;
//     }
//   } catch (error: any) {
//     if (error.response) {
//       console.error('🔴 서버 오류:', error.response.data);
//     } else if (error.request) {
//       console.error(
//         '🟡 요청이 전송되지 않음 (네트워크 오류 가능):',
//         error.request,
//       );
//     } else {
//       console.error(
//         '🔵 Challenge 검증 중 알 수 없는 오류 발생:',
//         error.message,
//       );
//     }
//     return false;
//   }
// }

import axios from 'axios';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

import {
  ISSUER_BACKEND_URL,
  ISSUER_INNER_PUBLIC_X25519_KEY,
  MEDIATOR_URL,
} from '@env';

/**
 * ============================================================
 * DIDAuth.ts
 *
 * 현재 목적:
 * - Android DID Auth 과정 디버깅
 * - Challenge 요청 여부 확인
 * - FCM deviceToken 전달 여부 확인
 * - Holder X25519 Private Key Base58 형식 확인
 * - Issuer X25519 Public Key Base58 형식 확인
 * - Encrypted Challenge Base58 형식 확인
 * - 정확히 어느 단계에서 복호화가 실패하는지 확인
 *
 * 주의:
 * - Private Key 전체 값은 절대 console.log 하지 않음
 * - FCM Token 전체 값도 출력하지 않음
 * ============================================================
 */

/**
 * Base58에서 사용할 수 있는 문자
 *
 * 제외 문자:
 * 0, O, I, l
 */
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;

/**
 * 민감한 문자열을 전체 노출하지 않고 일부만 보여주는 함수
 */
function createPreview(
  value?: string | null,
  frontLength = 10,
  backLength = 6,
): string {
  if (!value) {
    return 'EMPTY';
  }

  if (value.length <= frontLength + backLength) {
    return `[length=${value.length}]`;
  }

  return `${value.slice(0, frontLength)}...${value.slice(-backLength)}`;
}

/**
 * Base58 문자열 상태 검사
 *
 * 중요:
 * Private Key 내용 자체는 출력하지 않는다.
 */
function inspectBase58Value(
  label: string,
  value?: string | null,
  showPreview = false,
): string {
  const original = value ?? '';
  const trimmed = original.trim();

  const isValid =
    trimmed.length > 0 && BASE58_REGEX.test(trimmed);

  console.log(`🔍 [Base58 Check] ${label}`);
  console.log(' - exists:', original.length > 0);
  console.log(' - original length:', original.length);
  console.log(' - trimmed length:', trimmed.length);
  console.log(
    ' - whitespace changed:',
    original.length !== trimmed.length,
  );
  console.log(' - valid Base58 chars:', isValid);

  if (showPreview) {
    console.log(
      ' - preview:',
      createPreview(trimmed),
    );
  }

  /**
   * Base58에 허용되지 않는 문자가 있는 경우
   * 문자 자체를 모두 보여주지 않고
   * 위치와 Unicode code point만 출력
   */
  if (trimmed.length > 0 && !isValid) {
    const invalidCharacters: Array<{
      index: number;
      codePoint: number;
    }> = [];

    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];

      if (!BASE58_REGEX.test(char)) {
        invalidCharacters.push({
          index: i,
          codePoint: char.charCodeAt(0),
        });
      }
    }

    console.log(
      ' - invalid character count:',
      invalidCharacters.length,
    );

    console.log(
      ' - invalid character positions/codePoints:',
      invalidCharacters,
    );
  }

  console.log('---------------------------------------------');

  return trimmed;
}

/**
 * ============================================================
 * Mediator에 FCM Token 등록
 * ============================================================
 */
export async function regist_token(
  did: string,
  token: string,
) {
  const url =
    `https://${MEDIATOR_URL}/message/regist-token`;

  const requestBody = {
    DID: did,
    token,
  };

  console.log(
    '🚀 [Mediator] Token 등록 요청',
  );
  console.log(' - URL:', url);
  console.log(' - DID:', did);
  console.log(' - token exists:', !!token);
  console.log(' - token length:', token?.length);
  console.log(
    ' - token preview:',
    createPreview(token),
  );

  try {
    const response = await axios.post(
      url,
      requestBody,
    );

    console.log(
      '✅ [Mediator] Token 등록 성공:',
      response.status,
    );

    return response.data;
  } catch (error: any) {
    console.error(
      '❌ [Mediator] Token 등록 실패',
    );

    console.log(
      ' - Status:',
      error.response?.status,
    );

    console.log(
      ' - Server Data:',
      error.response?.data,
    );

    console.log(
      ' - Message:',
      error.message,
    );

    return null;
  }
}

/**
 * ============================================================
 * Issuer Backend로부터 Challenge 요청
 * ============================================================
 */
export async function get_challenge(
  authRequestId: string,
  did: string,
  deviceToken: string,
) {
  const url =
    `https://${ISSUER_BACKEND_URL}/indy/api/v1/did-auth/challenge`;

  const requestBody = {
    authRequestId,
    did,
    deviceToken,
  };

  console.log('');
  console.log(
    '============================================================',
  );
  console.log(
    '🚀 [DID Auth] Challenge Request',
  );
  console.log(
    '============================================================',
  );

  console.log('URL:', url);
  console.log('authRequestId:', authRequestId);
  console.log('did:', did);

  console.log(
    'deviceToken exists:',
    !!deviceToken,
  );

  console.log(
    'deviceToken length:',
    deviceToken?.length,
  );

  console.log(
    'deviceToken preview:',
    createPreview(deviceToken),
  );

  console.log(
    '============================================================',
  );

  try {
    const response = await axios.post(
      url,
      requestBody,
    );

    console.log(
      '✅ [DID Auth] Challenge Response Status:',
      response.status,
    );

    console.log(
      '✅ [DID Auth] Challenge exists:',
      !!response.data?.challenge,
    );

    console.log(
      '✅ [DID Auth] Challenge length:',
      response.data?.challenge?.length,
    );

    console.log(
      '✅ [DID Auth] Challenge preview:',
      createPreview(
        response.data?.challenge,
      ),
    );

    return response.data.challenge;
  } catch (error: any) {
    console.error(
      '❌ [DID Auth] Challenge 요청 실패',
    );

    console.log(
      '❌ Status Code:',
      error.response?.status,
    );

    console.log(
      '❌ Server Data:',
      error.response?.data,
    );

    console.log(
      '❌ Error Message:',
      error.message,
    );

    if (error.response) {
      console.error(
        '🔴 서버가 HTTP Error Response 반환',
      );
    } else if (error.request) {
      console.error(
        '🟡 요청 전송 실패 또는 응답 없음',
      );
    } else {
      console.error(
        '🔵 Challenge 요청 생성 중 오류',
      );
    }

    return null;
  }
}

/**
 * ============================================================
 * Challenge 복호화
 *
 * Server:
 *   nonce(24 bytes) + encryptedChallenge
 *       ↓
 *   Base58
 *
 * Wallet:
 *   Base58 decode
 *       ↓
 *   nonce / ciphertext 분리
 *       ↓
 *   nacl.box.open()
 * ============================================================
 */
export async function decrypt_challenge(
  encryptedChallengeBase58: string,
  holderXSecretKey: string,
) {
  console.log('');
  console.log(
    '============================================================',
  );
  console.log(
    '🔐 [DID Auth] Challenge Decryption Start',
  );
  console.log(
    '============================================================',
  );

  try {
    /**
     * --------------------------------------------------------
     * STEP 1
     * 서버 Challenge 확인
     * --------------------------------------------------------
     */
    console.log(
      '📦 [STEP 1] Encrypted Challenge 검사',
    );

    const challengeBase58 =
      inspectBase58Value(
        'Encrypted Challenge',
        encryptedChallengeBase58,
        true,
      );

    if (!challengeBase58) {
      throw new Error(
        'Encrypted Challenge가 존재하지 않습니다.',
      );
    }

    /**
     * --------------------------------------------------------
     * STEP 2
     * Holder X25519 Private Key 검사
     *
     * 중요:
     * Private Key 값은 출력하지 않음
     * --------------------------------------------------------
     */
    console.log(
      '🔑 [STEP 2] Holder X25519 Private Key 검사',
    );

    const holderXPrivateKeyBase58 =
      inspectBase58Value(
        'Holder X25519 Private Key',
        holderXSecretKey,
        false,
      );

    if (!holderXPrivateKeyBase58) {
      throw new Error(
        'Holder X25519 Private Key가 존재하지 않습니다.',
      );
    }

    /**
     * --------------------------------------------------------
     * STEP 3
     * Holder Private Key Base58 Decode
     * --------------------------------------------------------
     */
    console.log(
      '🔓 [STEP 3] Holder Private Key Base58 Decode 시도',
    );

    let holderXPrivateKey: Uint8Array;

    try {
      holderXPrivateKey = bs58.decode(
        holderXPrivateKeyBase58,
      );
    } catch (error) {
      console.error(
        '❌ [STEP 3 FAILED] Holder X25519 Private Key Base58 decode 실패',
      );

      throw error;
    }

    console.log(
      '✅ [STEP 3] Holder Private Key decode 성공',
    );

    console.log(
      ' - decoded length:',
      holderXPrivateKey.length,
    );

    if (holderXPrivateKey.length !== 32) {
      throw new Error(
        `Holder X25519 Private Key 길이가 올바르지 않습니다. expected=32, actual=${holderXPrivateKey.length}`,
      );
    }

    /**
     * --------------------------------------------------------
     * STEP 4
     * Issuer X25519 Public Key 검사
     * --------------------------------------------------------
     */
    console.log(
      '🔑 [STEP 4] Issuer X25519 Public Key 검사',
    );

    const issuerX25519PublicKeyBase58 =
      inspectBase58Value(
        'Issuer X25519 Public Key',
        ISSUER_INNER_PUBLIC_X25519_KEY,
        true,
      );

    if (!issuerX25519PublicKeyBase58) {
      throw new Error(
        'Issuer X25519 Public Key가 .env에 존재하지 않습니다.',
      );
    }

    /**
     * --------------------------------------------------------
     * STEP 5
     * Issuer Public Key Base58 Decode
     * --------------------------------------------------------
     */
    console.log(
      '🔓 [STEP 5] Issuer Public Key Base58 Decode 시도',
    );

    let issuerX25519PublicKey: Uint8Array;

    try {
      issuerX25519PublicKey = bs58.decode(
        issuerX25519PublicKeyBase58,
      );
    } catch (error) {
      console.error(
        '❌ [STEP 5 FAILED] Issuer X25519 Public Key Base58 decode 실패',
      );

      throw error;
    }

    console.log(
      '✅ [STEP 5] Issuer Public Key decode 성공',
    );

    console.log(
      ' - decoded length:',
      issuerX25519PublicKey.length,
    );

    if (issuerX25519PublicKey.length !== 32) {
      throw new Error(
        `Issuer X25519 Public Key 길이가 올바르지 않습니다. expected=32, actual=${issuerX25519PublicKey.length}`,
      );
    }

    /**
     * --------------------------------------------------------
     * STEP 6
     * Encrypted Challenge Base58 Decode
     * --------------------------------------------------------
     */
    console.log(
      '📦 [STEP 6] Encrypted Challenge Base58 Decode 시도',
    );

    let combinedData: Uint8Array;

    try {
      combinedData = bs58.decode(
        challengeBase58,
      );
    } catch (error) {
      console.error(
        '❌ [STEP 6 FAILED] Encrypted Challenge Base58 decode 실패',
      );

      throw error;
    }

    console.log(
      '✅ [STEP 6] Encrypted Challenge decode 성공',
    );

    console.log(
      ' - combined data length:',
      combinedData.length,
    );

    if (combinedData.length < 24) {
      throw new Error(
        `Encrypted Challenge 길이가 너무 짧습니다. actual=${combinedData.length}`,
      );
    }

    /**
     * --------------------------------------------------------
     * STEP 7
     * Nonce + CipherText 분리
     * --------------------------------------------------------
     */
    console.log(
      '✂️ [STEP 7] Nonce / CipherText 분리',
    );

    const nonce = combinedData.slice(
      0,
      24,
    );

    const encryptedChallenge =
      combinedData.slice(24);

    console.log(
      ' - nonce length:',
      nonce.length,
    );

    console.log(
      ' - cipherText length:',
      encryptedChallenge.length,
    );

    if (nonce.length !== 24) {
      throw new Error(
        `Nonce 길이가 올바르지 않습니다. expected=24, actual=${nonce.length}`,
      );
    }

    /**
     * --------------------------------------------------------
     * STEP 8
     * NaCl box.open
     * --------------------------------------------------------
     */
    console.log(
      '🔐 [STEP 8] nacl.box.open() 복호화 시도',
    );

    const decryptedChallenge =
      nacl.box.open(
        encryptedChallenge,
        nonce,
        issuerX25519PublicKey,
        holderXPrivateKey,
      );

    if (!decryptedChallenge) {
      console.error(
        '❌ [STEP 8 FAILED] nacl.box.open() returned null',
      );

      console.error(
        '가능한 원인:',
      );

      console.error(
        '  1. Holder X25519 Private Key가 Challenge 생성 당시의 키와 다름',
      );

      console.error(
        '  2. Issuer X25519 Public Key가 서버 Private Key와 대응하지 않음',
      );

      console.error(
        '  3. Challenge ciphertext 또는 nonce 포맷 불일치',
      );

      throw new Error(
        'Challenge cryptographic decryption failed',
      );
    }

    console.log(
      '✅ [STEP 8] nacl.box.open() 복호화 성공',
    );

    console.log(
      ' - decrypted byte length:',
      decryptedChallenge.length,
    );

    /**
     * --------------------------------------------------------
     * STEP 9
     * 복호화된 Challenge를 Base58로 변환
     * --------------------------------------------------------
     */
    console.log(
      '🔄 [STEP 9] Decrypted Challenge → Base58',
    );

    const decryptedChallengeBase58 =
      bs58.encode(
        decryptedChallenge,
      );

    console.log(
      '✅ [STEP 9] Base58 변환 성공',
    );

    console.log(
      ' - decrypted challenge length:',
      decryptedChallengeBase58.length,
    );

    console.log(
      ' - decrypted challenge preview:',
      createPreview(
        decryptedChallengeBase58,
      ),
    );

    console.log(
      '============================================================',
    );
    console.log(
      '🎉 [DID Auth] Challenge Decryption SUCCESS',
    );
    console.log(
      '============================================================',
    );

    return decryptedChallengeBase58;
  } catch (error: any) {
    console.log(
      '============================================================',
    );

    console.error(
      '❌ [DID Auth] Challenge Decryption FAILED',
    );

    console.error(
      'Error name:',
      error?.name,
    );

    console.error(
      'Error message:',
      error?.message,
    );

    console.log(
      '============================================================',
    );

    return null;
  }
}

/**
 * ============================================================
 * Challenge 검증
 * ============================================================
 */
export async function verify_challenge(
  authRequestId: string,
  did: string,
  decryptedChallenge: string,
): Promise<boolean> {
  const url =
    `https://${ISSUER_BACKEND_URL}/indy/api/v1/did-auth/verify`;

  const requestBody = {
    authRequestId,
    did,
    decryptedChallenge,
  };

  console.log('');
  console.log(
    '============================================================',
  );

  console.log(
    '🔎 [DID Auth] Challenge Verification Request',
  );

  console.log(
    '============================================================',
  );

  console.log(
    'URL:',
    url,
  );

  console.log(
    'authRequestId:',
    authRequestId,
  );

  console.log(
    'did:',
    did,
  );

  console.log(
    'decryptedChallenge exists:',
    !!decryptedChallenge,
  );

  console.log(
    'decryptedChallenge length:',
    decryptedChallenge?.length,
  );

  console.log(
    'decryptedChallenge preview:',
    createPreview(
      decryptedChallenge,
    ),
  );

  try {
    const response = await axios.post(
      url,
      requestBody,
    );

    console.log(
      '📡 [DID Auth] Verify Response Status:',
      response.status,
    );

    console.log(
      '📡 [DID Auth] Verify Response Data:',
      response.data,
    );

    /**
     * 기존 Backend 동작 유지
     */
    if (response.status === 201) {
      console.log(
        `✅ [DID Auth] Authentication SUCCESS: ${did}`,
      );

      return true;
    }

    console.warn(
      `❌ [DID Auth] Authentication FAILED: ${did}`,
    );

    return false;
  } catch (error: any) {
    console.error(
      '❌ [DID Auth] Challenge Verification Error',
    );

    console.log(
      ' - Status:',
      error.response?.status,
    );

    console.log(
      ' - Server Data:',
      error.response?.data,
    );

    console.log(
      ' - Message:',
      error.message,
    );

    if (error.response) {
      console.error(
        '🔴 서버가 Verify Error Response를 반환했습니다.',
      );
    } else if (error.request) {
      console.error(
        '🟡 Verify 요청을 보냈지만 응답을 받지 못했습니다.',
      );
    } else {
      console.error(
        '🔵 Verify 요청 생성 중 오류가 발생했습니다.',
      );
    }

    return false;
  }
}