// src/hooks/useDidAuth.ts
import {useState, useEffect} from 'react';
import {Alert} from 'react-native';
import {getItem} from '../utils/storage/AsyncStorage';
import {
  get_challenge,
  decrypt_challenge,
  verify_challenge,
} from '../utils/did/DIDAuth';
import {DidData} from '../types/did';

export const useDidAuth = (authRequestId?: string, onSuccess?: () => void) => {
  const [didList, setDidList] = useState<DidData[]>([]);
  const [selectedDid, setSelectedDid] = useState<DidData | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [token, setToken] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [progressLog, setProgressLog] = useState<string>('대기 중...');

  // DID 목록 및 토큰 로드
  const loadDidList = async () => {
    try {
      const storedToken = await getItem('fcmToken');
      setToken(storedToken);
      const listJson = await getItem('DID_LIST');
      if (listJson) {
        const list: DidData[] = JSON.parse(listJson);
        setDidList(list);
        const storedSelected = await getItem('SELECTED_DID');
        if (storedSelected) {
          setSelectedDid(JSON.parse(storedSelected));
        } else if (list.length > 0) {
          setSelectedDid(list[0]);
        }
      }
    } catch (error) {
      console.error('DID 로드 실패:', error);
    }
  };

  useEffect(() => {
    loadDidList();
  }, []);

  // DID 선택 핸들러
  const handleSelectDid = (item: DidData) => {
    setSelectedDid(item);
    setIsModalVisible(false);
    setProgressLog('대기 중...');
  };

  // 원클릭 DID 인증 프로세스
  const handleOneClickAuth = async () => {
    if (!selectedDid || !authRequestId) {
      Alert.alert('오류', 'DID 또는 Request ID가 없습니다.');
      return;
    }

    setIsAuthLoading(true);
    setProgressLog('1. Challenge 요청 중...');

    try {
      // 1. Challenge 요청
      const challengeRes = await get_challenge(
        authRequestId,
        selectedDid.did,
        token,
      );
      if (!challengeRes) throw new Error('Challenge 생성 실패');

      setProgressLog('2. Challenge 복호화 중...');

      // 2. Challenge 복호화
      const decryptedRes = await decrypt_challenge(
        challengeRes,
        selectedDid.xSecretkey,
      );
      if (!decryptedRes) throw new Error('복호화 실패');

      setProgressLog('3. 최종 검증 중...');

      // 3. 최종 검증 (Verify)
      const verifyRes = await verify_challenge(
        authRequestId,
        selectedDid.did,
        decryptedRes,
      );

      if (verifyRes === true) {
        setProgressLog('✅ 인증 성공!');
        Alert.alert('성공', 'DID Auth에 성공했습니다.', [
          {
            text: '확인',
            onPress: () => onSuccess?.(),
          },
        ]);
      } else {
        throw new Error('검증 결과: 실패');
      }
    } catch (error: any) {
      console.error('Auth Process Error:', error);
      setProgressLog(`❌ 실패: ${error.message || '알 수 없는 오류'}`);
      Alert.alert('인증 실패', error.message || '과정 중 문제가 발생했습니다.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  return {
    didList,
    selectedDid,
    isModalVisible,
    setIsModalVisible,
    isAuthLoading,
    progressLog,
    handleSelectDid,
    handleOneClickAuth,
  };
};
