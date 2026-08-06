import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

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
  if (!selectedDid) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>선택된 DID가 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>선택된 DID 정보</Text>
        {onRenamePress && (
          <TouchableOpacity style={styles.renameBtn} onPress={onRenamePress}>
            <Text style={styles.renameBtnText}>✏️ 이름 변경</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Alias:</Text>
        <Text style={styles.value}>{selectedDid.alias || '-'}</Text>

        <Text style={styles.label}>DID:</Text>
        <Text style={styles.value}>{selectedDid.did}</Text>

        {selectedDid.edVerkey && (
          <>
            <Text style={styles.label}>Ed Verkey:</Text>
            <Text style={styles.value}>{selectedDid.edVerkey}</Text>
          </>
        )}

        {selectedDid.xVerkey && (
          <>
            <Text style={styles.label}>X25519 Verkey:</Text>
            <Text style={styles.value}>{selectedDid.xVerkey}</Text>
          </>
        )}

        {selectedDid.rsaPublicKey && (
          <>
            <Text style={styles.label}>RSA Public Key:</Text>
            <Text style={styles.value} numberOfLines={3} ellipsizeMode="tail">
              {selectedDid.rsaPublicKey}
            </Text>
          </>
        )}

        {/* 🚀 Helper Data 항목 추가 */}
        <Text style={styles.label}>Helper Data:</Text>
        <Text style={styles.value} numberOfLines={3} ellipsizeMode="tail">
          {selectedDid.helperData}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  renameBtn: {
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  renameBtnText: {
    fontSize: 12,
    color: '#1a73e8',
    fontWeight: '600',
  },
  fieldGroup: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 6,
  },
  value: {
    fontSize: 13,
    color: '#333',
  },
});
