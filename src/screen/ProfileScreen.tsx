import React, {useState, useEffect} from 'react';
import {StyleSheet, Text, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {removeItem, setItem, getItem} from '../utils/AsyncStorage';
import {
  generateSeparateKeyPairs,
  registerDID,
  addX25519PublicKey,
} from '../utils/DIDGenerator';

// 분리한 컴포넌트와 타입 불러오기
import {DidData} from '../types/did';
import DidList from '../component/profile/DidList';
import DidDetail from '../component/profile/DidDetail';
import ActionButtons from '../component/profile/ActionButtons';
import RenameModal from '../component/profile/RenameModal';

function ProfileScreen() {
  const [didList, setDidList] = useState<DidData[]>([]);
  const [selectedDid, setSelectedDid] = useState<DidData | null>(null);

  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [tempAlias, setTempAlias] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectDid = async (item: DidData) => {
    setSelectedDid(item);
    await setItem('SELECTED_DID', JSON.stringify(item));
  };

  const create_did = async () => {
    try {
      setIsLoading(true);
      const result_did = await generateSeparateKeyPairs();
      const newDidData: DidData = {
        did: result_did.did,
        edVerkey: result_did.edPublicKey,
        edSecretkey: result_did.edPrivateKey,
        xVerkey: result_did.x25519PublicKey,
        xSecretkey: result_did.x25519PrivateKey,
        createdAt: Date.now(),
        alias: `DID #${didList.length + 1}`,
        isRegistered: false,
      };

      const updatedList = [...didList, newDidData];
      setDidList(updatedList);
      await handleSelectDid(newDidData);
      await setItem('DID_LIST', JSON.stringify(updatedList));

      Alert.alert('생성 완료', '새로운 DID가 로컬에 생성되었습니다.');
    } catch (e) {
      console.error(e);
      Alert.alert('생성 실패', 'DID 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const register_did = async () => {
    if (!selectedDid) {
      Alert.alert('등록 실패', '선택된 DID가 없습니다.');
      return;
    }
    try {
      setIsLoading(true);
      const registerResponse = await registerDID(
        'J4BALc9uEa8F1GCy7uka7f',
        selectedDid.did,
        selectedDid.edVerkey,
      );
      if (!registerResponse) {
        Alert.alert('등록 실패', '원장에 DID(NYM)를 등록하지 못했습니다.');
        setIsLoading(false);
        return;
      }

      const attribResponse = await addX25519PublicKey(
        selectedDid.did,
        selectedDid.did,
        selectedDid.xVerkey,
        selectedDid.edSecretkey,
      );
      if (!attribResponse) {
        Alert.alert('실패', 'X25519 키(ATTRIB) 추가 실패');
        setIsLoading(false);
        return;
      }

      const updatedDid = {...selectedDid, isRegistered: true};
      const updatedList = didList.map(item =>
        item.did === selectedDid.did ? {...item, isRegistered: true} : item,
      );

      setDidList(updatedList);
      await handleSelectDid(updatedDid);
      await setItem('DID_LIST', JSON.stringify(updatedList));

      Alert.alert('등록 성공', `DID(${selectedDid.alias}) 원장 등록 완료!`);
    } catch (error) {
      console.error('등록 실패:', error);
      Alert.alert('등록 실패', '네트워크 통신 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const remove_did = async () => {
    if (!selectedDid) return;
    try {
      const updatedList = didList.filter(item => item.did !== selectedDid.did);
      setDidList(updatedList);
      setSelectedDid(null);
      await removeItem('SELECTED_DID');
      await setItem('DID_LIST', JSON.stringify(updatedList));
      Alert.alert('삭제 성공', '선택한 DID가 로컬에서 삭제되었습니다.');
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  const loadAndMigrateData = async () => {
    try {
      const oldDid = await getItem('DID');
      if (oldDid) {
        const migratedDid: DidData = {
          did: oldDid,
          edVerkey: await getItem('edVerkey'),
          edSecretkey: await getItem('edSecretkey'),
          xVerkey: await getItem('xVerkey'),
          xSecretkey: await getItem('xSecretkey'),
          createdAt: Date.now(),
          alias: '기존 DID',
          isRegistered: true,
        };
        const newList = [migratedDid];
        await setItem('DID_LIST', JSON.stringify(newList));
        setDidList(newList);
        await handleSelectDid(migratedDid);
        await removeItem('DID');
      } else {
        const storedList = await getItem('DID_LIST');
        if (storedList) {
          const parsedList: DidData[] = JSON.parse(storedList);
          setDidList(parsedList);
          const storedSelected = await getItem('SELECTED_DID');
          if (parsedList.length > 0) {
            setSelectedDid(
              storedSelected ? JSON.parse(storedSelected) : parsedList[0],
            );
          }
        }
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
  };

  const openRenameModal = () => {
    if (!selectedDid) return;
    setTempAlias(selectedDid.alias || '');
    setIsRenameModalVisible(true);
  };

  const saveAlias = async () => {
    if (!selectedDid) return;
    if (!tempAlias.trim()) {
      Alert.alert('알림', '별칭을 입력해주세요.');
      return;
    }
    try {
      const updatedDid = {...selectedDid, alias: tempAlias};
      const updatedList = didList.map(item =>
        item.did === selectedDid.did ? updatedDid : item,
      );
      setDidList(updatedList);
      await handleSelectDid(updatedDid);
      await setItem('DID_LIST', JSON.stringify(updatedList));
      setIsRenameModalVisible(false);
    } catch (e) {
      console.error('별칭 수정 실패:', e);
    }
  };

  useEffect(() => {
    loadAndMigrateData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>DID Wallet</Text>

      <DidList
        didList={didList}
        selectedDid={selectedDid}
        onSelectDid={handleSelectDid}
      />

      <DidDetail
        selectedDid={selectedDid}
        onOpenRenameModal={openRenameModal}
      />

      <ActionButtons
        selectedDid={selectedDid}
        isLoading={isLoading}
        onCreate={create_did}
        onRegister={register_did}
        onDelete={remove_did}
      />

      <RenameModal
        visible={isRenameModalVisible}
        tempAlias={tempAlias}
        onChangeText={setTempAlias}
        onClose={() => setIsRenameModalVisible(false)}
        onSave={saveAlias}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: -30,
    paddingBottom: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 0,
    textAlign: 'center',
    color: '#333',
  },
});

export default ProfileScreen;
