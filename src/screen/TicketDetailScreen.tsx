import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useRoute, RouteProp, useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useWalletStore } from '../store/useWalletStore';
import { createVP } from '../utils/VCVP/createVP';

type RootStackParamList = {
  TicketDetail: {vc: any};
};

export default function TicketDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'TicketDetail'>>();
  const navigation = useNavigation<any>();
  const vc = route.params.vc;

  const [showJsonRaw, setShowJsonRaw] = useState(false);
  const subject = vc?.credentialSubject;

  // 26.08.18 추가
  // VP검증을 위해
  const selectedDid =
  useWalletStore(
    state => state.selectedDid,
  );
  // 26.08.18 추가
  // VP검증을 위해
  const openCameraComponent = async () => {
  try {
    if (!selectedDid) {
      Alert.alert(
        'DID 오류',
        '티켓 검증에 사용할 DID가 선택되지 않았습니다.',
      );
      return;
    }

    if (!vc) {
      Alert.alert(
        '티켓 오류',
        '검증할 VC가 없습니다.',
      );
      return;
    }

    // 현재 VC의 소유 DID 확인
    const subject =
      vc?.credentialSubject ??
      vc?.credential?.credentialSubject;

    if (!subject?.id) {
      throw new Error(
        'VC에 credentialSubject.id가 없습니다.',
      );
    }

    if (subject.id !== selectedDid.did) {
      throw new Error(
        '현재 선택된 DID와 티켓의 소유 DID가 일치하지 않습니다.',
      );
    }

    // VP 생성
    const vp = await createVP(
      vc,
      selectedDid,
    );

    // 기존 CameraScreen QR mode 사용
    navigation.navigate('Camera', {
      mode: 'QR',
      vp,
    });
  } catch (error) {
    console.error(
      '❌ VP 생성 실패:',
      error,
    );

    Alert.alert(
      'VP 생성 실패',
      error instanceof Error
        ? error.message
        : '티켓 검증용 VP를 생성하지 못했습니다.',
    );
  }
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>티켓 상세 정보</Text>
        <View style={{width: 32}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 상단 티켓 카드 메인 뷰 */}
        <View style={styles.ticketCard}>
          <Text style={styles.issuerTag}>
            {subject?.issuedBy?.name ?? '공식 티켓'}
          </Text>
          <Text style={styles.ticketNoText}>
            No. {subject?.ticketNumber || '-'}
          </Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>소유 자격</Text>
              <Text style={styles.infoValue}>
                {Array.isArray(subject?.underName)
                  ? `${subject.underName.length}명 지정`
                  : '1명 지정'}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>검증 상태</Text>
              <Text style={[styles.infoValue, {color: '#10b981'}]}>
                ✓ Verified VC
              </Text>
            </View>
          </View>
        </View>

        {/* JSON 원문 아코디언 */}
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setShowJsonRaw(!showJsonRaw)}>
          <Text style={styles.accordionTitle}>
            Verifiable Credential 원문 (JSON)
          </Text>
          <Ionicons
            name={showJsonRaw ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#64748b"
          />
        </TouchableOpacity>

        {showJsonRaw && (
          <View style={styles.jsonBox}>
            <Text style={styles.jsonText}>{JSON.stringify(vc, null, 2)}</Text>
          </View>
        )}
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={openCameraComponent}>
          <Ionicons name="qr-code-outline" size={20} color="#ffffff" />
          <Text style={styles.primaryButtonText}>
            티켓 검증 및 오프라인 입장
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#f8fafc'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backIconButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  scrollContent: {padding: 20},
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  issuerTag: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.5,
  },
  ticketNoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginVertical: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  jsonBox: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  jsonText: {
    fontSize: 11,
    fontFamily: 'Platform',
    color: '#38bdf8',
  },
  bottomButtons: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
