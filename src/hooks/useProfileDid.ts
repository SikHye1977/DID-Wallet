// src/hooks/useProfileDid.ts
import {useState, useEffect, useCallback} from 'react';
import {Alert} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {removeItem, setItem, getItem} from '../utils/storage/AsyncStorage';
import {
  generateSeparateKeyPairs,
  registerDID,
  addPublicKeysToAttrib,
  setupIndyPool,
} from '../utils/did/DIDGenerator';
import {DidData} from '../types/did';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useProfileDid = () => {
  const navigation = useNavigation<any>();

  const [didList, setDidList] = useState<DidData[]>([]);
  const [selectedDid, setSelectedDid] = useState<DidData | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // 선택된 DID 저장 및 반영
  const handleSelectDid = async (item: DidData) => {
    setSelectedDid(item);
    await setItem('SELECTED_DID', JSON.stringify(item));
  };

  // 1. 새 DID 생성 (키 생성 후 카메라 화면 진입)
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

  // 2. Indy 원장 DID 및 공개키 등록
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
        selectedDid.edVerkey,
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
        selectedDid.xVerkey,
        formattedRsaKey,
        selectedDid.edSecretkey,
        selectedDid.helperData,
      );

      if (!attribResponse) {
        Alert.alert('실패', 'ATTRIB 키(X25519/RSA) 추가에 실패했습니다.');
        setIsRegistering(false);
        return;
      }

      const updatedDid = {...selectedDid, isRegistered: true};
      const updatedList = didList.map(item =>
        item.did === selectedDid.did ? {...item, isRegistered: true} : item,
      );

      setDidList(updatedList);
      await handleSelectDid(updatedDid);

      await setItem('DID_LIST', JSON.stringify(updatedList));

      Alert.alert(
        '등록 성공',
        `DID(${selectedDid.alias})가 원장에 정상 등록되었습니다!`,
      );
    } catch (error) {
      console.error('등록 과정 실패:', error);
      Alert.alert('등록 실패', '트랜잭션 중 오류가 발생했습니다.');
    } finally {
      setIsRegistering(false);
    }
  };

  // 3. 특정 DID 삭제
  const removeDid = async () => {
    if (!selectedDid) return;

    try {
      const updatedList = didList.filter(item => item.did !== selectedDid.did);
      setDidList(updatedList);
      setSelectedDid(null);
      await removeItem('SELECTED_DID');
      await setItem('DID_LIST', JSON.stringify(updatedList));
      Alert.alert('삭제 성공', '선택한 DID가 삭제되었습니다.');
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  // 4. 저장된 DID 목록 불러오기
  const loadDidList = async () => {
    try {
      const storedList = await getItem('DID_LIST');
      if (storedList) {
        const parsedList: DidData[] = JSON.parse(storedList);
        setDidList(parsedList);

        const storedSelected = await getItem('SELECTED_DID');
        if (storedSelected) {
          setSelectedDid(JSON.parse(storedSelected));
        } else if (parsedList.length > 0) {
          setSelectedDid(parsedList[0]);
        }
      } else {
        setDidList([]);
        setSelectedDid(null);
      }
    } catch (error) {
      console.error('DID 로드 실패:', error);
    }
  };

  // 5. 이전 데이터 단일 DID $\rightarrow$ 리스트 마이그레이션
  const migrateOldData = async () => {
    const oldDid = await getItem('DID');
    if (oldDid) {
      const oldEdVerkey = await getItem('edVerkey');
      const oldEdSecret = await getItem('edSecretkey');
      const oldXVerkey = await getItem('xVerkey');
      const oldXSecret = await getItem('xSecretkey');

      const migratedDid: DidData = {
        did: oldDid,
        edVerkey: oldEdVerkey,
        edSecretkey: oldEdSecret,
        xVerkey: oldXVerkey,
        xSecretkey: oldXSecret,
        createdAt: Date.now(),
        alias: '기존 DID',
      };

      const newList = [migratedDid];
      await setItem('DID_LIST', JSON.stringify(newList));
      setDidList(newList);
      setSelectedDid(migratedDid);

      await handleSelectDid(migratedDid);
      await removeItem('DID');
    } else {
      loadDidList();
    }
  };

  // 6. 별칭 업데이트
  const updateAlias = async (newAlias: string) => {
    if (!selectedDid) return;

    try {
      const updatedDid = {...selectedDid, alias: newAlias};
      const updatedList = didList.map(item =>
        item.did === selectedDid.did ? {...item, alias: newAlias} : item,
      );

      setDidList(updatedList);
      await handleSelectDid(updatedDid);
      await setItem('DID_LIST', JSON.stringify(updatedList));
    } catch (e) {
      console.error('별칭 수정 실패:', e);
      throw e;
    }
  };

  useEffect(() => {
    migrateOldData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDidList();
    }, []),
  );

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
