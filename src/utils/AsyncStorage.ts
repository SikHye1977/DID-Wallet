import AsyncStorage from '@react-native-async-storage/async-storage';

// 25.01.22
// 디바이스 저장소를 이용하기 위한 함수

export const setItem = async (key: string, value: string) => {
  try {
    await AsyncStorage.setItem(key, value);

    // 저장값 확인을 위한 console.log
    console.log(`setItem... ${key} : ${value}`);
  } catch (e) {
    throw e;
  }
};

export const getItem = async (key: string) => {
  try {
    const res = await AsyncStorage.getItem(key);
    return res || '';
  } catch (e) {
    throw e;
  }
};

export const removeItem = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`${key} 삭제 완료`);
  } catch (error) {
    console.error(`${key} 삭제 실패`, error);
  }
};

// 25.08.20 추가
/**
 * 저장된 VC 중 ticketId에 해당하는 항목을 찾아
 * credentialStatus의 statusListCredential 값을 ipfs://<cid>로 교체한다.
 * - credentialStatus가 배열/객체 둘 다 대응
 * - VC 루트/중첩(credential.credentialStatus) 둘 다 대응
 */
export async function updateStatusListCid(
  ticketId: string,
  cid: string,
): Promise<{found: boolean; updated: boolean}> {
  const key = `vc:${ticketId}`;
  const raw = await getItem(key);
  if (!raw) {
    console.warn(`[VC] not found for ticketId: ${ticketId}`);
    return {found: false, updated: false};
  }

  let vc: any;
  try {
    vc = JSON.parse(raw);
  } catch (e) {
    console.error('[VC] JSON parse error:', e);
    return {found: true, updated: false};
  }

  const ipfsUri = cid.startsWith('ipfs://') ? cid : `ipfs://${cid}`;

  // 내부 갱신 함수 (객체/배열 모두 처리)
  const replaceInStatus = (status: any): {status: any; touched: boolean} => {
    let touched = false;

    if (Array.isArray(status)) {
      const replaced = status.map(entry => {
        if (entry?.type === 'BitstringStatusListEntry') {
          touched = touched || entry?.statusListCredential !== ipfsUri;
          return {...entry, statusListCredential: ipfsUri};
        }
        return entry;
      });
      return {status: replaced, touched};
    }

    if (status && typeof status === 'object') {
      if (status?.type === 'BitstringStatusListEntry') {
        touched = status?.statusListCredential !== ipfsUri;
        return {
          status: {...status, statusListCredential: ipfsUri},
          touched,
        };
      }
      // 다른 타입이라면 그대로 반환
      return {status, touched: false};
    }

    // 없거나 형식이 다르면 BitstringStatusListEntry 새로 구성
    return {
      status: [
        {
          type: 'BitstringStatusListEntry',
          statusPurpose: 'revocation',
          statusListCredential: ipfsUri,
        },
      ],
      touched: true,
    };
  };

  let updated = false;

  // 1) 표준 위치: 루트의 credentialStatus
  if ('credentialStatus' in vc) {
    const {status, touched} = replaceInStatus(vc.credentialStatus);
    vc.credentialStatus = status;
    updated = updated || touched;
  }
  // 2) 과거 스키마 대응: vc.credential.credentialStatus
  else if (vc?.credential?.credentialStatus !== undefined) {
    const {status, touched} = replaceInStatus(vc.credential.credentialStatus);
    vc.credential = {...vc.credential, credentialStatus: status};
    updated = updated || touched;
  }
  // 3) 둘 다 없으면 표준 위치에 생성
  else {
    const {status, touched} = replaceInStatus(undefined);
    vc.credentialStatus = status;
    updated = updated || touched;
  }

  if (updated) {
    await setItem(key, JSON.stringify(vc));
    console.log(`[VC] statusListCredential updated: ${key} -> ${ipfsUri}`);
  } else {
    console.log('[VC] already up-to-date.');
  }

  return {found: true, updated};
}
