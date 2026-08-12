import {useState} from 'react';
import {Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
  generateSeparateKeyPairs,
  registerDID,
  addPublicKeysToAttrib,
  setupIndyPool,
} from '../utils/did/DIDGenerator';
import {DidData} from '../types/did';
import {useWalletStore} from '../store/useWalletStore';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useProfileDid = () => {
  const navigation = useNavigation<any>();

  // 💡 Zustand 스토어 상태 및 액션 연결
  const {didList, selectedDid, setDidList, setSelectedDid} = useWalletStore();

  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // 1. 선택된 DID 변경 (Zustand 스토어 자동 저장)
  const handleSelectDid = (item: DidData) => {
    setSelectedDid(item);
  };

  // 2. 새 DID 생성 (키 생성 후 카메라 화면 진입 - 기존 로직 유지)
  const createDid = async () => {
    try {
      const result_did = await generateSeparateKeyPairs();
      navigation.navigate('Camera', {
        mode: 'GENERATE',
        pendingDidKeys: result_did,
      });
    } catch (e) {
      console.error(e);
      Alert.alert('생성 실패', 'DID 및 키 생성 중 오류가 발생했습니다.');
    }
  };

  // 3. Indy 원장 DID 및 공개키 등록
  const registerDid = async () => {
    if (!selectedDid) {
      Alert.alert('등록 실패', '선택된 DID가 없습니다.');
      return;
    }

    setIsRegistering(true);

    const pool = await setupIndyPool();
    if (!pool) {
      Alert.alert('등록 실패', 'Indy Pool 연결에 실패했습니다.');
      setIsRegistering(false);
      return;
    }

    try {
      console.log('🔄 [Step 1] NYM 트랜잭션 전송 중...');
      const registerResponse = await registerDID(
        pool,
        'J4BALc9uEa8F1GCy7uka7f', // Trustee DID
        selectedDid.did,
        selectedDid.edVerkey || '',
      );

      if (!registerResponse) {
        Alert.alert('등록 실패', 'DID(NYM) 등록에 실패했습니다.');
        setIsRegistering(false);
        return;
      }

      console.log('✅ NYM 트랜잭션 완료. 노드 합의 대기 중 (1.5초)...');
      await sleep(1500);

      let formattedRsaKey = selectedDid.rsaPublicKey;
      if (formattedRsaKey) {
        formattedRsaKey = formattedRsaKey
          .replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----/g, '')
          .replace(/\r?\n|\r/g, '')
          .trim();
      }

      console.log('🔄 [Step 2 & 3] ATTRIB (X25519 + RSA) 순차 등록 시작');
      const attribResponse = await addPublicKeysToAttrib(
        pool,
        selectedDid.did,
        selectedDid.did,
        selectedDid.xVerkey || '',
        formattedRsaKey,
        selectedDid.edSecretkey || '',
        selectedDid.helperData,
      );

      if (!attribResponse) {
        Alert.alert('실패', 'ATTRIB 키(X25519/RSA) 추가에 실패했습니다.');
        setIsRegistering(false);
        return;
      }

      // Zustand 스토어 업데이트
      const updatedDid = {...selectedDid, isRegistered: true};
      const updatedList = didList.map(item =>
        item.did === selectedDid.did ? {...item, isRegistered: true} : item,
      );

      setDidList(updatedList);
      setSelectedDid(updatedDid);

      Alert.alert(
        '등록 성공',
        `DID(${selectedDid.alias || 'DID'})가 원장에 정상 등록되었습니다!`,
      );
    } catch (error) {
      console.error('등록 과정 실패:', error);
      Alert.alert('등록 실패', '트랜잭션 중 오류가 발생했습니다.');
    } finally {
      setIsRegistering(false);
    }
  };

  // 4. 특정 DID 삭제 (Zustand 스토어 반영)
  const removeDid = async () => {
    if (!selectedDid) return;

    try {
      const updatedList = didList.filter(item => item.did !== selectedDid.did);
      setDidList(updatedList);

      // 삭제 후 목록의 첫 번째 항목 선택 또는 null
      setSelectedDid(updatedList.length > 0 ? updatedList[0] : null);
      Alert.alert('삭제 성공', '선택한 DID가 삭제되었습니다.');
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  // 5. 별칭 업데이트 (Zustand 스토어 반영)
  const updateAlias = async (newAlias: string) => {
    if (!selectedDid) return;

    try {
      const updatedDid = {...selectedDid, alias: newAlias};
      const updatedList = didList.map(item =>
        item.did === selectedDid.did ? {...item, alias: newAlias} : item,
      );

      setDidList(updatedList);
      setSelectedDid(updatedDid);
    } catch (e) {
      console.error('별칭 수정 실패:', e);
      throw e;
    }
  };

  return {
    didList,
    selectedDid,
    isRegistering,
    handleSelectDid,
    createDid,
    registerDid,
    removeDid,
    updateAlias,
  };
};
