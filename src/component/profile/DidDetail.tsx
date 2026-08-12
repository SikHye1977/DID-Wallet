import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';

interface DidData {
  did: string;
  alias?: string;
  edVerkey?: string;
  xVerkey?: string;
  rsaPublicKey?: string;
  helperData?: string;
}

interface DidDetailProps {
  selectedDid: DidData | null;
  onRenamePress?: () => void;
}

export default function DidDetail({
  selectedDid,
  onRenamePress,
}: DidDetailProps) {
  // 🚀 상세보기 모달 열기/닫기 상태
  const [isModalVisible, setIsModalVisible] = useState(false);

  if (!selectedDid) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>선택된 DID가 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. 상단 컴팩트 헤더 */}
      <View style={styles.headerRow}>
        <View style={styles.titleBox}>
          <Text style={styles.headerTitle}>선택된 DID</Text>
          <Text style={styles.aliasText}>
            {selectedDid.alias || '이름 없음'}
          </Text>
        </View>

        <View style={styles.btnGroup}>
          {/* 🚀 자세히 보기 버튼 */}
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => setIsModalVisible(true)}>
            <Text style={styles.detailBtnText}>🔍 자세히 보기</Text>
          </TouchableOpacity>

          {/* 이름 변경 버튼 */}
          {onRenamePress && (
            <TouchableOpacity style={styles.renameBtn} onPress={onRenamePress}>
              <Text style={styles.renameBtnText}>✏️ 이름 변경</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. 요약 정보 (컴팩트 뷰) */}
      <View style={styles.contentBox}>
        <View style={styles.row}>
          <Text style={styles.label}>DID</Text>
          <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
            {selectedDid.did}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Ed Verkey</Text>
          <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
            {selectedDid.edVerkey || '데이터 없음'}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>X25519</Text>
          <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
            {selectedDid.xVerkey || '데이터 없음'}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>RSA Public</Text>
          <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
            {selectedDid.rsaPublicKey || '데이터 없음'}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Helper Data</Text>
          <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
            {selectedDid.helperData || '데이터 없음'}
          </Text>
        </View>
      </View>

      {/* 3. 🚀 전체 키 원문 확인 팝업 모달 */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 모달 헤더 */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSubTitle}>FULL KEY DETAILS</Text>
                <Text style={styles.modalTitle}>
                  {selectedDid.alias || 'DID 상세 정보'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeIconBtn}
                onPress={() => setIsModalVisible(false)}>
                <Text style={styles.closeIconText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 전체 키 값 출력 스크롤 뷰 */}
            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={true}>
              <View style={styles.fullFieldGroup}>
                <Text style={styles.fullLabel}>DID Identifier</Text>
                <View style={styles.fullValueBox}>
                  <Text style={styles.fullValueText} selectable={true}>
                    {selectedDid.did}
                  </Text>
                </View>
              </View>

              <View style={styles.fullFieldGroup}>
                <Text style={styles.fullLabel}>
                  Ed25519 Public Key (Verkey)
                </Text>
                <View style={styles.fullValueBox}>
                  <Text style={styles.fullValueText} selectable={true}>
                    {selectedDid.edVerkey || '데이터 없음'}
                  </Text>
                </View>
              </View>

              <View style={styles.fullFieldGroup}>
                <Text style={styles.fullLabel}>
                  X25519 Public Key (DIDComm)
                </Text>
                <View style={styles.fullValueBox}>
                  <Text style={styles.fullValueText} selectable={true}>
                    {selectedDid.xVerkey || '데이터 없음'}
                  </Text>
                </View>
              </View>

              <View style={styles.fullFieldGroup}>
                <Text style={styles.fullLabel}>
                  RSA 2048 Public Key (Biometric)
                </Text>
                <View style={styles.fullValueBox}>
                  <Text style={styles.fullValueText} selectable={true}>
                    {selectedDid.rsaPublicKey || '데이터 없음'}
                  </Text>
                </View>
              </View>

              <View style={styles.fullFieldGroup}>
                <Text style={styles.fullLabel}>
                  Fuzzy Extractor Helper Data (P)
                </Text>
                <View style={styles.fullValueBox}>
                  <Text style={styles.fullValueText} selectable={true}>
                    {selectedDid.helperData || '데이터 없음'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* 하단 닫기 버튼 */}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsModalVisible(false)}>
              <Text style={styles.modalCloseBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  titleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
  },
  aliasText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  detailBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  detailBtnText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  renameBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  renameBtnText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
  },
  contentBox: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    width: 75,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  value: {
    flex: 1,
    fontSize: 11,
    color: '#334155',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    fontFamily: 'Platform',
  },

  /* 🚀 팝업 모달 스타일 */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  modalSubTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 2,
  },
  closeIconBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIconText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: 'bold',
  },
  modalScrollView: {
    marginBottom: 16,
  },
  fullFieldGroup: {
    marginBottom: 12,
  },
  fullLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  fullValueBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fullValueText: {
    fontSize: 12,
    color: '#334155',
    fontFamily: 'Platform',
    lineHeight: 18,
  },
  fullValueTextHighlight: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
    fontFamily: 'Platform',
    lineHeight: 18,
  },
  modalCloseBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
