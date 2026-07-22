import React, {useState, useEffect} from 'react';
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
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

// DID 데이터 타입 정의 (기존 유지)
interface DidData {
  did: string;
  edVerkey: string;
  edSecretkey: string;
  xVerkey: string;
  xSecretkey: string;
  createdAt: number;
  alias?: string;
  isRegistered?: boolean;
}

function ProfileScreen() {
  // 껍데기 UI용 상태 관리
  const [didList, setDidList] = useState<DidData[]>([]);
  const [selectedDid, setSelectedDid] = useState<DidData | null>(null);

  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [tempAlias, setTempAlias] = useState('');

  // ✅ 더미(가짜) 함수: DID 선택
  const handleSelectDid = (item: DidData) => {
    setSelectedDid(item);
  };

  // ✅ 더미(가짜) 함수: DID 생성
  const create_did = () => {
    const mockDid: DidData = {
      did: `did:indy:dummy:${Math.floor(Math.random() * 10000)}`,
      edVerkey: 'MockEdVerkey123456789',
      edSecretkey: 'MockEdSecretkey123456789',
      xVerkey: 'MockXVerkey123456789',
      xSecretkey: 'MockXSecretkey123456789',
      createdAt: Date.now(),
      alias: `DID #${didList.length + 1}`,
      isRegistered: false,
    };

    const updatedList = [...didList, mockDid];
    setDidList(updatedList);
    setSelectedDid(mockDid);
    Alert.alert('생성 완료(UI)', 'UI 테스트용 가짜 DID가 생성되었습니다.');
  };

  // ✅ 더미(가짜) 함수: DID 등록
  const register_did = () => {
    if (!selectedDid) return;

    // UI상에서 등록된 상태로만 변경
    const updatedDid = {...selectedDid, isRegistered: true};
    const updatedList = didList.map(item =>
      item.did === selectedDid.did ? updatedDid : item,
    );

    setDidList(updatedList);
    setSelectedDid(updatedDid);
    Alert.alert('등록 성공(UI)', 'Ledger 등록 UI 테스트 성공!');
  };

  // ✅ 더미(가짜) 함수: DID 삭제
  const remove_did = () => {
    if (!selectedDid) return;
    const updatedList = didList.filter(item => item.did !== selectedDid.did);
    setDidList(updatedList);
    setSelectedDid(null);
  };

  // ✅ 별칭 수정 모달 열기
  const openRenameModal = () => {
    if (!selectedDid) return;
    setTempAlias(selectedDid.alias || '');
    setIsRenameModalVisible(true);
  };

  // ✅ 별칭 저장 로직 (UI 전용)
  const saveAlias = () => {
    if (!selectedDid) return;
    if (!tempAlias.trim()) {
      Alert.alert('알림', '별칭을 입력해주세요.');
      return;
    }

    const updatedDid = {...selectedDid, alias: tempAlias};
    const updatedList = didList.map(item =>
      item.did === selectedDid.did ? updatedDid : item,
    );

    setDidList(updatedList);
    setSelectedDid(updatedDid);
    setIsRenameModalVisible(false);
  };

  // 초기 렌더링 시 가짜 데이터 하나 넣어보기 (선택 사항)
  useEffect(() => {
    // 원하시면 아래 코드를 주석 해제하여 초기 데이터를 확인할 수 있습니다.
    /*
    const initialMock: DidData = {
      did: 'did:indy:test:1234',
      edVerkey: 'TestVerkey',
      edSecretkey: 'TestSecret',
      xVerkey: 'TestXVerkey',
      xSecretkey: 'TestXSecret',
      createdAt: Date.now(),
      alias: '기본 테스트 DID',
      isRegistered: false,
    };
    setDidList([initialMock]);
    setSelectedDid(initialMock);
    */
  }, []);

  // 리스트 아이템 렌더링
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
                selectedDid.isRegistered && styles.disabledButton,
              ]}
              onPress={register_did}
              disabled={selectedDid.isRegistered}>
              <Text style={styles.buttonText}>
                {selectedDid.isRegistered ? '등록됨' : '등록'}
              </Text>
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
