import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {DidData} from '../../types/did';

interface DidDetailProps {
  selectedDid: DidData | null;
  onOpenRenameModal: () => void;
}

export default function DidDetail({
  selectedDid,
  onOpenRenameModal,
}: DidDetailProps) {
  return (
    <View style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <Text style={styles.sectionTitle}>선택된 DID 정보</Text>
        {selectedDid && (
          <TouchableOpacity onPress={onOpenRenameModal} style={styles.editIcon}>
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
  );
}

const styles = StyleSheet.create({
  detailContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {fontSize: 16, fontWeight: '600', color: '#555'},
  editIcon: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  editText: {fontSize: 12, color: '#3b82f6', fontWeight: 'bold'},
  scrollDetail: {flex: 1},
  detailLabel: {fontSize: 12, fontWeight: 'bold', color: '#888', marginTop: 8},
  detailValue: {fontSize: 14, color: '#333', marginBottom: 4},
  emptyDetail: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emptyText: {color: '#999', textAlign: 'center', padding: 20},
});
