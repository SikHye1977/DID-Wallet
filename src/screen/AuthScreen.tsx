// src/screens/AuthScreen.tsx
import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';

import {useDidAuth} from '../hooks/useDidAuth';

type RootStackParamList = {
  MainTabs: undefined | {screen: string};
  Auth: {authRequestId?: string};
};

function AuthScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Auth'>>();

  const [authRequestId, setAuthRequestId] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    setAuthRequestId(route.params?.authRequestId);
  }, [route]);

  // 커스텀 훅 불러오기 (인증 성공 시 Home 화면 이동 콜백 전달)
  const {
    didList,
    selectedDid,
    isModalVisible,
    setIsModalVisible,
    isAuthLoading,
    progressLog,
    handleSelectDid,
    handleOneClickAuth,
  } = useDidAuth(authRequestId, () => {
    navigation.navigate('MainTabs', {screen: 'Home'});
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DID Auth Screen</Text>
        <Text style={styles.subText}>
          Request ID: {authRequestId || '없음'}
        </Text>

        {/* DID 선택 영역 */}
        <View style={styles.selectorContainer}>
          <Text style={styles.label}>인증에 사용할 DID:</Text>
          {selectedDid ? (
            <View style={styles.selectedInfo}>
              <Text style={styles.didAlias}>{selectedDid.alias}</Text>
              <Text style={styles.didString}>{selectedDid.did}</Text>
            </View>
          ) : (
            <Text style={styles.placeholder}>DID를 선택해주세요</Text>
          )}
          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => setIsModalVisible(true)}>
            <Text style={styles.changeButtonText}>DID 변경</Text>
          </TouchableOpacity>
        </View>

        {/* 진행 상황 표시 */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>상태: {progressLog}</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.mainButton, isAuthLoading && styles.disabledButton]}
          onPress={handleOneClickAuth}
          disabled={isAuthLoading}>
          {isAuthLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.mainButtonText}>인증하기</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* DID 선택 모달 */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>DID 선택</Text>
            <FlatList
              data={didList}
              keyExtractor={item => item.did}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedDid?.did === item.did && styles.modalItemSelected,
                  ]}
                  onPress={() => handleSelectDid(item)}>
                  <Text style={styles.itemAlias}>{item.alias}</Text>
                  <Text style={styles.itemDid} numberOfLines={1}>
                    {item.did}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}>
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 기존 스타일 동일 유지
  container: {flex: 1, padding: 20, backgroundColor: '#f9f9f9'},
  header: {alignItems: 'center', marginTop: 20},
  title: {fontSize: 22, fontWeight: 'bold', marginBottom: 5, color: '#333'},
  subText: {fontSize: 14, color: '#666', marginBottom: 20},
  label: {fontSize: 14, color: '#555', marginBottom: 5},
  selectorContainer: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  selectedInfo: {alignItems: 'center', marginBottom: 10},
  didAlias: {fontSize: 18, fontWeight: 'bold', color: '#3b82f6'},
  didString: {fontSize: 12, color: '#888', marginTop: 2},
  placeholder: {color: '#999', marginBottom: 10},
  changeButton: {
    backgroundColor: '#e0e7ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  changeButtonText: {color: '#3b82f6', fontWeight: 'bold', fontSize: 12},
  statusContainer: {marginTop: 20},
  statusText: {fontSize: 14, color: '#333', fontWeight: '600'},
  buttonContainer: {marginTop: 40, width: '100%', alignItems: 'center'},
  mainButton: {
    backgroundColor: '#3b82f6',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  mainButtonText: {color: '#fff', fontSize: 18, fontWeight: 'bold'},
  disabledButton: {backgroundColor: '#9ca3af'},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalItem: {padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee'},
  modalItemSelected: {backgroundColor: '#eff6ff'},
  itemAlias: {fontSize: 16, fontWeight: 'bold', color: '#333'},
  itemDid: {fontSize: 12, color: '#666'},
  closeButton: {
    marginTop: 15,
    backgroundColor: '#6b7280',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {color: 'white', fontWeight: 'bold'},
});

export default AuthScreen;
