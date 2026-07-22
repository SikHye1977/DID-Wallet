import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface ActionButtonsProps {
  selectedDid: any | null;
  isLoading: boolean;
  onCreate: () => void;
  onRegister: () => void;
  onDelete: () => void;
}

export default function ActionButtons({
  selectedDid,
  isLoading,
  onCreate,
  onRegister,
  onDelete,
}: ActionButtonsProps) {
  return (
    <View style={styles.buttonContainer}>
      <TouchableOpacity
        style={[styles.createButton, isLoading && styles.disabledButton]}
        onPress={onCreate}
        disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>+ 새 DID 생성</Text>
        )}
      </TouchableOpacity>

      {selectedDid && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.registerButton,
              (selectedDid.isRegistered || isLoading) && styles.disabledButton,
            ]}
            onPress={onRegister}
            disabled={selectedDid.isRegistered || isLoading}>
            <Text style={styles.buttonText}>
              {selectedDid.isRegistered ? '등록됨' : '등록'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            disabled={isLoading}>
            <Text style={styles.buttonText}>삭제</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {gap: 10},
  createButton: {
    backgroundColor: '#3b82f6',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtons: {flexDirection: 'row', gap: 10},
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
  buttonText: {color: '#fff', fontWeight: 'bold', fontSize: 16},
  disabledButton: {backgroundColor: '#9ca3af'},
});
