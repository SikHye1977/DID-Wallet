import React from 'react';
import {StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {HomeScreenNavigationProp} from '../types/navigation';

function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>UXM Wallet 홈</Text>

      {/* 탭 내 이동: 바텀 탭 메뉴가 유지됨 */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Profile')}>
        <Text style={styles.buttonText}>프로필 (DID 관리) 이동</Text>
      </TouchableOpacity>

      {/* 상위 스택 이동: 딥링크 테스트 화면 (전체 화면 전환) */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Auth')}>
        <Text style={styles.buttonText}>DID-Auth 로그인 이동</Text>
      </TouchableOpacity>

      {/* 🚀 상위 스택 이동: C++ RSA 모듈 테스트 화면 (바텀 탭에 없음) */}
      <TouchableOpacity
        style={[styles.button, styles.testButton]}
        onPress={() => navigation.navigate('Test')}>
        <Text style={styles.buttonText}>🧪 결정론적 RSA 검증 테스트</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#1e293b',
  },
  button: {
    width: '100%',
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  testButton: {
    backgroundColor: '#475569', // 테스트 버튼은 시각적으로 구분
    marginTop: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
