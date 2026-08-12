// src/screen/HomeScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, RouteProp} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import VCcard from '../component/Ticket/VCcard';
import {MainTabParamList} from '../types/navigation';
import {useWalletStore} from '../store/useWalletStore';

type HomeScreenRouteProp = RouteProp<MainTabParamList, 'Home'>;

export default function HomeScreen() {
  const route = useRoute<HomeScreenRouteProp>();
  const targetUrl = route.params?.targetUrl;

  // 💡 Zustand 스토어 구독
  const {selectedDid, vcList, addVc, setSelectedDid, didList} =
    useWalletStore();

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. FCM targetUrl 수신 시 VC 발급 처리
  useEffect(() => {
    if (targetUrl) {
      console.log('🎯 [HomeScreen] 수신된 targetUrl:', targetUrl);
      fetchVcData(targetUrl);
    }
  }, [targetUrl]);

  const fetchVcData = async (url: string) => {
    try {
      setLoading(true);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP 에러: ${response.status}`);

      const vcData = await response.json();

      if (vcData) {
        addVc(vcData);

        // 발급된 VC의 DID와 일치하는 기존 DID 객체를 목록에서 찾음
        const matchedDid = didList.find(
          item => item.did === vcData?.credentialSubject?.id,
        );

        if (matchedDid) {
          setSelectedDid(matchedDid); // ⭕️ 전체 DidData 객체 전달
        } else if (vcData?.credentialSubject?.id) {
          // didList에 없을 경우 DidData 타입 필수 필드를 채워서 전달
          setSelectedDid({
            did: vcData.credentialSubject.id,
            alias: selectedDid?.alias || 'DID',
            edVerkey: '',
            edSecretkey: '',
            xVerkey: '',
            xSecretkey: '',
            createdAt: Date.now(),
          });
        }

        Alert.alert('발급 완료', '새로운 VC 티켓이 정상적으로 발급되었습니다.');
      }
    } catch (error) {
      console.error('❌ VC 데이터 수신 실패:', error);
      Alert.alert('발급 오류', 'VC 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 2. 💡 선택된 DID의 did 값과 일치하는 VC 티켓만 필터링
  const filteredVcList = vcList.filter(
    vc => vc?.credentialSubject?.id === selectedDid?.did,
  );

  // 티켓 삭제
  const handleDeleteTicket = (ticketNumber: string) => {
    Alert.alert(
      '삭제 확인',
      `티켓 [${ticketNumber}]를 지갑에서 삭제하시겠습니까?`,
      [
        {text: '취소', style: 'cancel'},
        {
          text: '삭제',
          style: 'destructive',
          // onPress: () => removeVc(ticketNumber), // Zustand 스토어 삭제 액션 실행
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 지갑 헤더 */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>MY TICKETS</Text>
          <Text style={styles.headerSubtitle}>
            {selectedDid ? selectedDid.alias : '지갑 미선택'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {filteredVcList.length > 0 && (
            <TouchableOpacity
              style={[
                styles.editButton,
                isDeleteMode && styles.editButtonActive,
              ]}
              onPress={() => setIsDeleteMode(!isDeleteMode)}>
              <Ionicons
                name={isDeleteMode ? 'checkmark-outline' : 'trash-outline'}
                size={18}
                color={isDeleteMode ? '#ffffff' : '#64748b'}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* DID 정보 칩 */}
      {selectedDid && (
        <View style={styles.didChip}>
          <View style={styles.activeDot} />
          <Text style={styles.didText} numberOfLines={1} ellipsizeMode="middle">
            {selectedDid.did}
          </Text>
        </View>
      )}

      {/* 로딩 표시 */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.loadingText}>VC 데이터를 조회하는 중...</Text>
        </View>
      )}

      {/* 빈 상태 및 필터링된 리스트 */}
      {!loading && filteredVcList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="ticket-outline" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>보유한 티켓이 없습니다</Text>
          <Text style={styles.emptyDesc}>
            선택하신 DID ({selectedDid?.alias || '미선택'})에 소유된 VC 티켓이
            없습니다.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredVcList}
          keyExtractor={(item, index) =>
            `${item?.credentialSubject?.ticketNumber}_${index}`
          }
          renderItem={({item, index}) => (
            <VCcard
              index={index}
              vc={item}
              isDeleteMode={isDeleteMode}
              onDeletePress={tNum => handleDeleteTicket(tNum)}
            />
          )}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonActive: {
    backgroundColor: '#ef4444',
  },
  didChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  didText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    maxWidth: 240,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});
