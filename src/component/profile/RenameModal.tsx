import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
} from 'react-native';

interface RenameModalProps {
  visible: boolean;
  tempAlias: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function RenameModal({
  visible,
  tempAlias,
  onChangeText,
  onClose,
  onSave,
}: RenameModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>별칭 변경</Text>
          <TextInput
            style={styles.input}
            value={tempAlias}
            onChangeText={onChangeText}
            placeholder="새로운 별칭을 입력하세요"
            autoFocus
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelBtn]}
              onPress={onClose}>
              <Text style={styles.modalBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.saveBtn]}
              onPress={onSave}>
              <Text style={styles.modalBtnText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalBtn: {flex: 1, padding: 12, borderRadius: 8, alignItems: 'center'},
  cancelBtn: {backgroundColor: '#9ca3af'},
  saveBtn: {backgroundColor: '#3b82f6'},
  modalBtnText: {color: 'white', fontWeight: 'bold'},
});
