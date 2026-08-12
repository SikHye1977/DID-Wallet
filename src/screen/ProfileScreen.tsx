// src/screens/ProfileScreen.tsx
import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import DidDetail from '../component/profile/DidDetail';
import {useWalletStore} from '../store/useWalletStore';
import {DidData} from '../types/did';

function ProfileScreen() {
  // Zustand 스토어 구독
  const {
    didList,
    selectedDid,
    setSelectedDid,
    // 필요 시 스토어에 추가된 메서드를 꺼내어 연동
    // updateAlias, createDid, registerDid, removeDid
  } = useWalletStore();

  const [isRegistering, setIsRegistering] = useState(false);

  // 별칭 변경 모달 제어용 Local State
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [tempAlias, setTempAlias] = useState('');

  const openRenameModal = () => {
    if (!selectedDid) return;
    setTempAlias(selectedDid.alias || '');
    setIsRenameModalVisible(true);
  };

  const handleSaveAlias = async () => {
    if (!tempAlias.trim()) {
      Alert.alert('알림', '별칭을 입력해주세요.');
      return;
    }

    try {
      if (selectedDid) {
        // 선택된 DID의 별칭 업데이트 (Zustand 스토어 반영)
        const updatedList = didList.map(item =>
          item.did === selectedDid.did
            ? {...item, alias: tempAlias.trim()}
            : item,
        );
        useWalletStore.getState().setDidList(updatedList);
        setSelectedDid({...selectedDid, alias: tempAlias.trim()});
      }
      setIsRenameModalVisible(false);
    } catch {
      Alert.alert('오류', '별칭 수정 중 문제가 발생했습니다.');
    }
  };

  // 새 DID 생성
  const handleCreateDid = () => {
    Alert.alert('DID 생성', '새로운 DID를 생성하시겠습니까?', [
      {text: '취소', style: 'cancel'},
      {
        text: '생성',
        onPress: () => {
          Alert.alert('안내', '새 DID 생성 로직을 진행합니다.');
        },
      },
    ]);
  };

  // DID 등록
  const handleRegisterDid = async () => {
    if (!selectedDid) return;
    try {
      setIsRegistering(true);
      // 등록 비즈니스 로직 처리 후 스토어 업데이트 예시
      const updatedList = didList.map(item =>
        item.did === selectedDid.did ? {...item, isRegistered: true} : item,
      );
      useWalletStore.getState().setDidList(updatedList);
      setSelectedDid({...selectedDid, isRegistered: true});
      Alert.alert('완료', 'DID가 성공적으로 등록되었습니다.');
    } catch {
      Alert.alert('오류', 'DID 등록에 실패했습니다.');
    } finally {
      setIsRegistering(false);
    }
  };

  // DID 삭제
  const handleRemoveDid = () => {
    if (!selectedDid) return;
    Alert.alert('삭제 확인', `DID [${selectedDid.alias}]를 삭제하시겠습니까?`, [
      {text: '취소', style: 'cancel'},
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          const updatedList = didList.filter(
            item => item.did !== selectedDid.did,
          );
          useWalletStore.getState().setDidList(updatedList);
          // 삭제 후 목록의 첫 번째 항목 선택 또는 null
          setSelectedDid(
            updatedList.length > 0 ? updatedList[0] : (null as any),
          );
        },
      },
    ]);
  };

  const renderItem = ({item}: {item: DidData}) => (
    <TouchableOpacity
      style={[
        styles.didItem,
        selectedDid?.did === item.did && styles.selectedDidItem,
      ]}
      onPress={() => setSelectedDid(item)}>
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
      <DidDetail selectedDid={selectedDid} onRenamePress={openRenameModal} />

      {/* 버튼 영역 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateDid}>
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
              onPress={handleRegisterDid}
              disabled={selectedDid.isRegistered || isRegistering}>
              {isRegistering ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {selectedDid.isRegistered ? '등록됨' : '등록'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleRemoveDid}>
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
                onPress={handleSaveAlias}>
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
