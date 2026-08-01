import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

// 1. ✅ Props 인터페이스에 onBiometricCreate 추가 (선택적 속성)
interface ActionButtonsProps {
  selectedDid: any | null;
  isLoading: boolean;
  onCreate: () => void;
  onBiometricCreate?: () => void;
  onRegister: () => void;
  onDelete: () => void;
}

export default function ActionButtons({
  selectedDid,
  isLoading,
  onCreate,
  onBiometricCreate, // 2. ✅ 구조 분해 할당으로 받아오기
  onRegister,
  onDelete,
}: ActionButtonsProps) {
  return (
    <View style={styles.buttonContainer}>
      {/* 기본 DID 생성 버튼 */}
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

      {/* 🚀 3. 새로 추가된 안면 인증 DID 생성 버튼 */}
      {onBiometricCreate && (
        <TouchableOpacity
          style={[styles.biometricButton, isLoading && styles.disabledButton]}
          onPress={onBiometricCreate}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>📸 안면 인증 DID 만들기</Text>
          )}
        </TouchableOpacity>
      )}

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
  // 4. ✅ 안면 인증 버튼 전용 스타일 추가 (기존 둥근 모서리와 패딩 유지, 색상만 변경)
  biometricButton: {
    backgroundColor: '#8b5cf6', // 보라색
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
