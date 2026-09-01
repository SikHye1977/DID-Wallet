import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

type RootStackParamList = {TicketDetail: {vc: any}};

interface VCProps {
  vc: any;
  index?: number;
  isDeleteMode?: boolean;
  onDeletePress?: (ticketNumber: string) => void;
}

const VCcard = ({vc, index, isDeleteMode = false, onDeletePress}: VCProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const subject = vc?.credentialSubject;
  const ticketNumber = subject?.ticketNumber;

  const ownerIds = Array.isArray(subject?.underName)
    ? subject.underName.map((u: any) => u?.name ?? u?.id).filter(Boolean)
    : subject?.underName?.name ?? subject?.underName?.id
    ? [subject?.underName?.name ?? subject?.underName?.id]
    : [];

  const ownerLabel =
    ownerIds.length === 0
      ? '본인'
      : ownerIds.length === 1
      ? ownerIds[0]
      : `${ownerIds[0]} 외 ${ownerIds.length - 1}명`;

  const handlePress = () => {
    if (isDeleteMode && onDeletePress && ticketNumber) {
      onDeletePress(ticketNumber);
    } else {
      navigation.navigate('TicketDetail', {vc});
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.88}
      style={styles.cardWrapper}>
      <View style={[styles.cardContainer, isDeleteMode && styles.deleteBorder]}>
        {/* 카드 상단 헤더 */}
        <View style={styles.cardHeader}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>VALID TICKET</Text>
          </View>
          {index !== undefined && (
            <Text style={styles.ticketIndex}>
              #{String(index + 1).padStart(2, '0')}
            </Text>
          )}
        </View>

        {/* 메인 이벤트 이름 */}
        <Text style={styles.eventName} numberOfLines={1}>
          {subject?.issuedBy?.name ?? '공연/이벤트 티켓'}
        </Text>

        {/* 정보 그리드 */}
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.label} numberOfLines={1}>
              HOLDER (소유자)
            </Text>

            <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
              {ownerLabel}
            </Text>
          </View>

          <View style={styles.infoColRight}>
            <Text style={[styles.label, styles.rightText]} numberOfLines={1}>
              TICKET NO.
            </Text>

            <Text
              style={[styles.valueHighlight, styles.rightText]}
              numberOfLines={1}
              ellipsizeMode="middle">
              {ticketNumber || '-'}
            </Text>
          </View>
        </View>

        {/* 티켓 절취선 시각화 */}
        <View style={styles.dividerContainer}>
          <View style={styles.notchLeft} />
          <View style={styles.dashedLine} />
          <View style={styles.notchRight} />
        </View>

        {/* 카드 하단 액션 / 힌트 */}
        <View style={styles.cardFooter}>
          {isDeleteMode ? (
            <View style={styles.deleteHintBox}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
              <Text style={styles.deleteHintText}>탭하여 삭제</Text>
            </View>
          ) : (
            <>
              <View style={styles.barcodeIconPlaceholder}>
                <Ionicons name="qr-code-outline" size={18} color="#94a3b8" />
                <Text style={styles.tapDetailText}>상세보기 및 검증</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginVertical: 8,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  deleteBorder: {
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  badgeText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ticketIndex: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  eventName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 16,
  },

  infoCol: {
    flex: 1,
    minWidth: 0,
  },

  infoColRight: {
    flex: 1.7,
    minWidth: 0,
    alignItems: 'flex-end',
  },

  label: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  value: {
    fontSize: 14,
    color: '#f1f5f9',
    fontWeight: '600',
    width: '100%',
    flexShrink: 1,
  },

  valueHighlight: {
    fontSize: 14,
    color: '#38bdf8',
    fontWeight: '700',
    width: '100%',
    flexShrink: 1,
  },

  rightText: {
    textAlign: 'right',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    position: 'relative',
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  notchLeft: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    position: 'absolute',
    left: -28,
  },
  notchRight: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    position: 'absolute',
    right: -28,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  barcodeIconPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tapDetailText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  deleteHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteHintText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

export default VCcard;
