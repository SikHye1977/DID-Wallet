import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator, // ✅ 로딩 표시용 추가
} from 'react-native';
import {getItem} from '../utils/AsyncStorage';
import {
  decrypt_challenge,
  get_challenge,
  regist_token,
  verify_challenge,
} from '../utils/DIDAuth';
import {SafeAreaView} from 'react-native-safe-area-context';
import {RouteProp, useRoute} from '@react-navigation/native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';

import {DidData} from '../types/did';

type AuthScreenRouteParams = {authRequestId?: string};
type RootStackParamList = {
  MainTabs: undefined | {screen: keyof MainTabParamList};
  Auth: {authRequestId?: string};
};
type MainTabParamList = {
  Home: undefined;
  Ticket: undefined;
  Profile: undefined;
};

function AuthScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Auth'>>();
  const [authRequestId, setAuthRequestId] = useState<string | undefined>(
    undefined,
  );

  const [didList, setDidList] = useState<DidData[]>([]);
  const [selectedDid, setSelectedDid] = useState<DidData | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [token, setToken] = useState<any>(null);

  // ✅ 로딩 상태 추가
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // 화면 표시용 (실제 로직에는 로컬 변수 사용)
  const [progressLog, setProgressLog] = useState<string>('대기 중...');

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
    setAuthRequestId(route.params?.authRequestId);
    loadDidList();
  }, [route]);

  const handleSelectDid = (item: DidData) => {
    setSelectedDid(item);
    setIsModalVisible(false);
    setProgressLog('대기 중...');
  };

  // ==========================================================
  // 25.11.25 추가 및 수정
  // 통합 인증함수
  // ==========================================================
  const handleOneClickAuth = async () => {
    // 0. 사전 체크
    if (!selectedDid || !authRequestId) {
      Alert.alert('오류', 'DID 또는 Request ID가 없습니다.');
      return;
    }

    setIsAuthLoading(true); // 로딩 시작
    setProgressLog('1. Challenge 요청 중...');

    try {
      // ----------------------------------------------------
      // 1. Challenge 요청
      // ----------------------------------------------------
      const challengeRes = await get_challenge(
        authRequestId,
        selectedDid.did,
        token,
      );

      if (!challengeRes) {
        throw new Error('Challenge 생성 실패');
      }
      setProgressLog('2. Challenge 복호화 중...');

      // ----------------------------------------------------
      // 2. Challenge 복호화
      // (state가 아닌 방금 받은 challengeRes 변수를 바로 사용)
      // ----------------------------------------------------
      const decryptedRes = await decrypt_challenge(
        challengeRes,
        selectedDid.xSecretkey, // <--- 여기서 선택된 DID의 키를 넘겨줌
      );

      if (!decryptedRes) {
        throw new Error('복호화 실패');
      }
      setProgressLog('3. 최종 검증 중...');

      // ----------------------------------------------------
      // 3. 최종 검증 (Verify)
      // ----------------------------------------------------
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
            onPress: () => navigation.navigate('MainTabs', {screen: 'Home'}),
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
      setIsAuthLoading(false); // 로딩 종료
    }
  };

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

        {/* 기존 개별 버튼들은 테스트용으로 작게 남겨두거나 숨김 */}
        {/* <View style={styles.debugContainer}>
            <Text style={{marginBottom: 5, color: '#999'}}>디버그용 개별 실행</Text>
            <TouchableOpacity onPress={registtoken}><Text>FCM 토큰 등록</Text></TouchableOpacity>
            ...
        </View> 
        */}
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

  // ✅ 메인 버튼 스타일 강조
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

  // 모달 스타일 (기존 유지)
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
