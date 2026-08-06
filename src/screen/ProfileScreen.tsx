import React, {useState, useEffect, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {removeItem, setItem, getItem} from '../utils/AsyncStorage';
import {
  generateSeparateKeyPairs,
  registerDID,
  addPublicKeysToAttrib,
  setupIndyPool,
} from '../utils/DIDGenerator';

// ✅ 중앙 타입 정의 파일에서 DidData를 가져옵니다
import {DidData} from '../types/did';

import DidDetail from '../component/profile/DidDetail';
// 💡 원장 합의 대기용 헬퍼 함수
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function ProfileScreen() {
  const navigation = useNavigation<any>();

  const [didList, setDidList] = useState<DidData[]>([]);
  const [selectedDid, setSelectedDid] = useState<DidData | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // 별칭 변경을 위한 상태
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [tempAlias, setTempAlias] = useState('');

  // 선택된 DID를 Global로 공유하기 위한 함수
  const handleSelectDid = async (item: DidData) => {
    setSelectedDid(item);
    await setItem('SELECTED_DID', JSON.stringify(item));
  };

  // 1. 새 DID 생성 버튼: DID 및 기본 키 쌍(Ed25519, X25519) 생성 후 카메라 화면으로 이동
  const create_did = async () => {
    try {
      const result_did = await generateSeparateKeyPairs();

      // mode: 'GENERATE'를 전달하여 안면 촬영 카메라 진입
      navigation.navigate('Camera', {
        mode: 'GENERATE',
        pendingDidKeys: result_did,
      });
    } catch (e) {
      console.error(e);
      Alert.alert('생성 실패', 'DID 및 키 생성 중 오류가 발생했습니다.');
    }
  };

  // 2. DID 등록 (타임아웃 방지 및 RSA 포맷 정돈 적용)
  const register_did = async () => {
    if (!selectedDid) {
      Alert.alert('등록 실패', '선택된 DID가 없습니다.');
      return;
    }

    setIsRegistering(true);

    // 🚀 [핵심 1] 전체 등록 과정을 관장할 단 1개의 Pool 생성
    const pool = await setupIndyPool();
    if (!pool) {
      Alert.alert('등록 실패', 'Indy Pool 연결에 실패했습니다.');
      setIsRegistering(false);
      return;
    }

    try {
      console.log('🔄 [Step 1] NYM 트랜잭션 전송 중...');
      // 1. NYM 트랜잭션 (Ed25519 Verkey 등록)
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

      // 🚀 [핵심 2] 원장에서 신규 DID 검증 키(verkey) 반영 및 소켓 세션 안정화를 위해 1.5초 대기
      await sleep(1500);

      // 🚀 [핵심 3] RSA 키의 PEM 헤더 및 모든 개행문자(\n, \r) 정돈
      let formattedRsaKey = selectedDid.rsaPublicKey;
      if (formattedRsaKey) {
        formattedRsaKey = formattedRsaKey
          .replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----/g, '')
          .replace(/\r?\n|\r/g, '')
          .trim();
      }

      console.log('🔄 [Step 2 & 3] ATTRIB (X25519 + RSA) 순차 등록 시작');

      // 2. ATTRIB 트랜잭션 (X25519 + RSA 공개키 순차 등록)
      const attribResponse = await addPublicKeysToAttrib(
        pool,
        selectedDid.did, // Submitter = 본인 DID
        selectedDid.did, // Target = 본인 DID
        selectedDid.xVerkey,
        formattedRsaKey, // 정돈된 RSA Public Key
        selectedDid.edSecretkey,
        selectedDid.helperData,
      );

      if (!attribResponse) {
        Alert.alert('실패', 'ATTRIB 키(X25519/RSA) 추가에 실패했습니다.');
        setIsRegistering(false);
        return;
      }

      // 상태 업데이트 및 로컬 저장
      const updatedDid = {...selectedDid, isRegistered: true};
      const updatedList = didList.map(item =>
        item.did === selectedDid.did ? {...item, isRegistered: true} : item,
      );

      setDidList(updatedList);
      await handleSelectDid(updatedDid);
      setSelectedDid({...selectedDid, isRegistered: true});

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
  const remove_did = async () => {
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

  // 5. 초기화: 기존 단일 DID 데이터가 있다면 리스트로 마이그레이션
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

  // 6. 별칭 수정 모달 열기
  const openRenameModal = () => {
    if (!selectedDid) return;
    setTempAlias(selectedDid.alias || '');
    setIsRenameModalVisible(true);
  };

  // 7. 별칭 저장 로직
  const saveAlias = async () => {
    if (!selectedDid) return;
    if (!tempAlias.trim()) {
      Alert.alert('알림', '별칭을 입력해주세요.');
      return;
    }

    try {
      const updatedDid = {...selectedDid, alias: tempAlias};
      const updatedList = didList.map(item =>
        item.did === selectedDid.did ? {...item, alias: tempAlias} : item,
      );

      setDidList(updatedList);
      await handleSelectDid(updatedDid);
      setSelectedDid({...selectedDid, alias: tempAlias});

      await setItem('DID_LIST', JSON.stringify(updatedList));

      setIsRenameModalVisible(false);
    } catch (e) {
      console.error('별칭 수정 실패:', e);
      Alert.alert('오류', '별칭 수정 중 문제가 발생했습니다.');
    }
  };

  useEffect(() => {
    migrateOldData();
  }, []);

  // 🚀 화면이 활성화(Focus)될 때마다 최신 DID 목록 및 선택된 DID 다시 로드
  useFocusEffect(
    useCallback(() => {
      loadDidList();
    }, []),
  );

  // UI 렌더링
  const renderItem = ({item}: {item: DidData}) => (
    <TouchableOpacity
      style={[
        styles.didItem,
        selectedDid?.did === item.did && styles.selectedDidItem,
      ]}
      onPress={() => handleSelectDid(item)}>
      <Text style={styles.didAlias}>{item.alias}</Text>
      <Text style={styles.didDetailText} numberOfLines={1}>
        {item.did}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>DID Wallet</Text>

      {/* DID 목록 영역 */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>
          보유 DID 목록 ({didList.length})
        </Text>
        <FlatList
          data={didList}
          renderItem={renderItem}
          keyExtractor={item => item.did}
          style={styles.flatList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>생성된 DID가 없습니다.</Text>
          }
        />
      </View>

      {/* 선택된 DID 상세 정보 */}
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <Text style={styles.sectionTitle}>선택된 DID 정보</Text>
          {selectedDid && (
            <TouchableOpacity onPress={openRenameModal} style={styles.editIcon}>
              <Text style={styles.editText}>✏️ 이름 변경</Text>
            </TouchableOpacity>
          )}
        </View>
        {selectedDid ? (
          <ScrollView style={styles.scrollDetail}>
            <Text style={styles.detailLabel}>Alias:</Text>
            <Text style={styles.detailValue}>{selectedDid.alias}</Text>

            <Text style={styles.detailLabel}>DID:</Text>
            <Text style={styles.detailValue}>{selectedDid.did}</Text>

            <Text style={styles.detailLabel}>Ed Verkey:</Text>
            <Text style={styles.detailValue}>{selectedDid.edVerkey}</Text>

            <Text style={styles.detailLabel}>X25519 Verkey:</Text>
            <Text style={styles.detailValue}>{selectedDid.xVerkey}</Text>

            {selectedDid.rsaPublicKey && (
              <>
                <Text style={styles.detailLabel}>RSA Public Key:</Text>
                <Text style={styles.detailValue} numberOfLines={2}>
                  {selectedDid.rsaPublicKey.slice(0, 50)}...
                </Text>
              </>
            )}
            <Text style={styles.detailLabel}>HelperData:</Text>
            <Text style={styles.detailValue}>{selectedDid.helperData}</Text>
          </ScrollView>
        ) : (
          <View style={styles.emptyDetail}>
            <Text style={styles.emptyText}>목록에서 DID를 선택해주세요.</Text>
          </View>
        )}
      </View>

      {/* 버튼 영역 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.createButton} onPress={create_did}>
          <Text style={styles.buttonText}>+ 새 DID 생성</Text>
        </TouchableOpacity>

        {selectedDid && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.registerButton,
                (selectedDid.isRegistered || isRegistering) &&
                  styles.disabledButton,
              ]}
              onPress={register_did}
              disabled={selectedDid.isRegistered || isRegistering}>
              {isRegistering ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {selectedDid.isRegistered ? '등록됨' : '등록'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteButton} onPress={remove_did}>
              <Text style={styles.buttonText}>삭제</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 별칭 수정 모달 */}
      <Modal
        visible={isRenameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRenameModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>별칭 변경</Text>
            <TextInput
              style={styles.input}
              value={tempAlias}
              onChangeText={setTempAlias}
              placeholder="새로운 별칭을 입력하세요"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setIsRenameModalVisible(false)}>
                <Text style={styles.modalBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={saveAlias}>
                <Text style={styles.modalBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#555',
  },
  listContainer: {
    flex: 1,
    marginBottom: 20,
  },
  flatList: {
    flexGrow: 0,
    maxHeight: 200,
  },
  didItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedDidItem: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    borderWidth: 2,
  },
  didAlias: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  didDetailText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  scrollDetail: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  emptyDetail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  buttonContainer: {
    gap: 10,
  },
  createButton: {
    backgroundColor: '#3b82f6',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  registerButton: {
    flex: 1,
    backgroundColor: '#10b981',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  editIcon: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  editText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#9ca3af',
  },
  saveBtn: {
    backgroundColor: '#3b82f6',
  },
  modalBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
