import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import VCcard from '../component/Ticket/VCcard';

// 🚀 UI 확인용 더미 DID 데이터
const DUMMY_DID = {
  did: 'did:indy:custom:56CDhh5p46fYjEYsETygwf',
  alias: '안면 인증 DID 지갑',
};

// 🚀 UI 확인용 더미 티켓 VC 목록
const DUMMY_VC_LIST = [
  {
    credentialSubject: {
      ticketNumber: 'UXM-2026-VIP-01',
      issuedBy: {name: '2026 AI & Media Tech Summit'},
      underName: [{name: '한승훈'}],
      id: 'did:indy:custom:56CDhh5p46fYjEYsETygwf',
    },
    issuanceDate: '2026-08-05T12:00:00Z',
    type: ['VerifiableCredential', 'TicketCredential'],
  },
  {
    credentialSubject: {
      ticketNumber: 'FESTA-2026-B07',
      issuedBy: {name: '2026 글로벌 블록체인 페스티벌'},
      underName: [{name: '한승훈'}, {name: '홍길동'}],
      id: 'did:indy:custom:56CDhh5p46fYjEYsETygwf',
    },
    issuanceDate: '2026-08-01T09:30:00Z',
    type: ['VerifiableCredential', 'TicketCredential'],
  },
];

export default function HomeScreen() {
  const [vcList, setVcList] = useState<any[]>(DUMMY_VC_LIST);
  const [currentDid, setCurrentDid] = useState<typeof DUMMY_DID | null>(
    DUMMY_DID,
  );
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  // 더미 삭제 동작
  const handleDeleteTicket = (ticketNumber: string) => {
    Alert.alert(
      '삭제 확인',
      `티켓 [${ticketNumber}]를 지갑에서 삭제하시겠습니까?`,
      [
        {text: '취소', style: 'cancel'},
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            setVcList(prev =>
              prev.filter(
                item => item.credentialSubject.ticketNumber !== ticketNumber,
              ),
            );
          },
        },
      ],
    );
  };

  // 🧪 상태 변경 테스트용 버튼 (빈 지갑 vs 티켓 있음 토글)
  const toggleDummyState = () => {
    if (vcList.length > 0) {
      setVcList([]);
    } else {
      setVcList(DUMMY_VC_LIST);
      setCurrentDid(DUMMY_DID);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 지갑 헤더 */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>MY TICKETS</Text>
          <Text style={styles.headerSubtitle}>
            {currentDid ? currentDid.alias : '지갑 미선택'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {/* 더미 상태 토글 (빈 화면 미리보기용) */}
          <TouchableOpacity style={styles.toggleBtn} onPress={toggleDummyState}>
            <Ionicons name="sparkles-outline" size={16} color="#2563eb" />
          </TouchableOpacity>

          {vcList.length > 0 && (
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
      {currentDid && (
        <View style={styles.didChip}>
          <View style={styles.activeDot} />
          <Text style={styles.didText} numberOfLines={1} ellipsizeMode="middle">
            {currentDid.did}
          </Text>
        </View>
      )}

      {/* 빈 상태 및 리스트 */}
      {!currentDid || vcList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="ticket-outline" size={56} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>보유한 티켓이 없습니다</Text>
          <Text style={styles.emptyDesc}>
            우측 상단의 반짝이(✨) 버튼을 누르면 더미 티켓 목록을 다시
            불러옵니다.
          </Text>
        </View>
      ) : (
        <FlatList
          data={vcList}
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
  toggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
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
