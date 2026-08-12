import {useState} from 'react';
import {Alert} from 'react-native';
import {useWalletStore} from '../store/useWalletStore';
import {DidData} from '../types/did';
import {getItem} from '../utils/storage/AsyncStorage'; // deviceToken 가져오기용
import {
  get_challenge,
  decrypt_challenge,
  verify_challenge,
} from '../utils/did/DIDAuth';

export const useDidAuth = (authRequestId?: string, onSuccess?: () => void) => {
  // Zustand 스토어 구독
  const {didList, selectedDid, setSelectedDid} = useWalletStore();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [progressLog, setProgressLog] = useState('대기 중...');

  const handleSelectDid = (didItem: DidData) => {
    setSelectedDid(didItem);
    setIsModalVisible(false);
  };

  const handleOneClickAuth = async () => {
    if (!selectedDid) {
      Alert.alert('알림', '인증에 사용할 DID를 선택해주세요.');
      return;
    }

    if (!selectedDid.xSecretkey) {
      Alert.alert('오류', '선택된 DID의 X25519 비밀키가 존재하지 않습니다.');
      return;
    }

    try {
      setIsAuthLoading(true);

      // 1. 디바이스 푸시 토큰 가져오기 (필요 시)
      const deviceToken = (await getItem('fcmToken')) || '';

      // -------------------------------------------------------------
      // Step 1. 백엔드로부터 암호화된 Challenge 수신
      // -------------------------------------------------------------
      setProgressLog('1/3: Challenge 요청 중...');
      console.log('🚀 [DID Auth] Challenge 요청:', selectedDid.did);

      const encryptedChallenge = await get_challenge(
        authRequestId || '',
        selectedDid.did,
        deviceToken,
      );

      if (!encryptedChallenge) {
        throw new Error('Challenge 수신에 실패했습니다.');
      }

      // -------------------------------------------------------------
      // Step 2. 수신된 Challenge 복호화 (X25519 Private Key 이용)
      // -------------------------------------------------------------
      setProgressLog('2/3: Challenge 복호화 중...');

      const decryptedChallenge = await decrypt_challenge(
        encryptedChallenge,
        selectedDid.xSecretkey, // 👈 Zustand에서 선택된 DID의 xSecretkey 전달
      );

      if (!decryptedChallenge) {
        throw new Error('Challenge 복호화에 실패했습니다.');
      }

      // -------------------------------------------------------------
      // Step 3. 복호화된 Challenge 검증 요청
      // -------------------------------------------------------------
      setProgressLog('3/3: Challenge 검증 중...');

      const isSuccess = await verify_challenge(
        authRequestId || '',
        selectedDid.did,
        decryptedChallenge,
      );

      if (!isSuccess) {
        throw new Error('Challenge 검증에 실패했습니다.');
      }

      setProgressLog('인증 성공!');
      Alert.alert('성공', 'DID 인증이 완료되었습니다.', [
        {
          text: '확인',
          onPress: () => onSuccess?.(),
        },
      ]);
    } catch (error: any) {
      console.error('❌ [DID Auth Error]:', error);
      setProgressLog(`인증 실패: ${error?.message || '알 수 없는 오류'}`);
      Alert.alert(
        '인증 실패',
        error?.message || 'DID 인증 진행 중 오류가 발생했습니다.',
      );
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
