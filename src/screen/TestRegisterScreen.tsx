import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

// 🚀 C++ Native 결정론적 RSA 생성 모듈
import {
  generateDeterministicRSAKeyPair,
  DeterministicRSAResult,
} from '../utils/crypto/DeterministicRSA';

type TestLog = {
  title: string;
  status: 'SUCCESS' | 'FAIL' | 'INFO';
  detail: string;
};

export default function TestRegisterScreen() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<TestLog[]>([]);

  // 이전 카메라 촬영 로그에서 나온 실제 Key(R) 및 Fingerprint
  const TARGET_SEED =
    'ea8e9f6f3f98d1f313ddd2a7a93c6dac8a864da7cf9b20d61d898ef407a1be6d';
  const EXPECTED_FINGERPRINT =
    '40f6f3cdb77f1154985de86e47da080ddb538dc6e2966fe7aea960a6e4b997bb';

  const runRsaTest = async () => {
    setLoading(true);
    setLogs([]);
    const testLogs: TestLog[] = [];

    const addLog = (
      title: string,
      status: 'SUCCESS' | 'FAIL' | 'INFO',
      detail: string,
    ) => {
      testLogs.push({title, status, detail});
    };

    try {
      // =========================================================================
      // [테스트 1] 동일 시드 1차 생성
      // =========================================================================
      const start1 = Date.now();
      const res1: DeterministicRSAResult =
        await generateDeterministicRSAKeyPair(TARGET_SEED);
      const time1 = Date.now() - start1;

      addLog(
        '1차 RSA 키 생성 연산',
        'INFO',
        `소요 시간: ${time1}ms\nFingerprint: ${res1.fingerprint.slice(
          0,
          30,
        )}...`,
      );

      // =========================================================================
      // [테스트 2] 동일 시드 2차 생성 (재현성 검증)
      // =========================================================================
      const start2 = Date.now();
      const res2: DeterministicRSAResult =
        await generateDeterministicRSAKeyPair(TARGET_SEED);
      const time2 = Date.now() - start2;

      const isSameReproduced =
        res1.publicKey === res2.publicKey &&
        res1.fingerprint === res2.fingerprint;

      if (isSameReproduced) {
        addLog(
          '1. 동일 SEED 재현성 검증',
          'SUCCESS',
          `✅ 성공: 100% 동일한 공개키 및 Fingerprint 복구 완료 (${time2}ms)`,
        );
      } else {
        addLog(
          '1. 동일 SEED 재현성 검증',
          'FAIL',
          '❌ 실패: 동일 시드임에도 서로 다른 키가 생성되었습니다.',
        );
      }

      // =========================================================================
      // [테스트 3] 이전 카메라 촬영 로그값과 일치성 검증
      // =========================================================================
      const isMatchedWithTarget = res1.fingerprint === EXPECTED_FINGERPRINT;

      if (isMatchedWithTarget) {
        addLog(
          '2. 이전 카메라 스캔 Fingerprint 일치성',
          'SUCCESS',
          '✅ 성공: 이전 카메라 촬영 시 원장에 기록된 Fingerprint와 완벽 일치',
        );
      } else {
        addLog(
          '2. 이전 카메라 스캔 Fingerprint 일치성',
          'FAIL',
          `❌ 실패: Fingerprint 불일치\n- 기대값: ${EXPECTED_FINGERPRINT}\n- 결과값: ${res1.fingerprint}`,
        );
      }

      // =========================================================================
      // [테스트 4] 시드 변형 민감도 검증 (끝 1자 변경)
      // =========================================================================
      // 'd' -> 'e'로 끝 1자만 변경
      const MODIFIED_SEED =
        'ea8e9f6f3f98d1f313ddd2a7a93c6dac8a864da7cf9b20d61d898ef407a1be6e';
      const res3: DeterministicRSAResult =
        await generateDeterministicRSAKeyPair(MODIFIED_SEED);

      const isDifferentKey = res1.fingerprint !== res3.fingerprint;

      if (isDifferentKey) {
        addLog(
          '3. 시드 민감도 검증 (1비트 변경 시)',
          'SUCCESS',
          `✅ 성공: 시드 변경 시 전혀 다른 Fingerprint 생성됨\n- 변형 키 Fingerprint: ${res3.fingerprint.slice(
            0,
            30,
          )}...`,
        );
      } else {
        addLog(
          '3. 시드 민감도 검증 (1비트 변경 시)',
          'FAIL',
          '❌ 실패: 시드가 달라졌으나 동일한 키가 생성되었습니다.',
        );
      }
    } catch (error) {
      console.error('[Test Error]', error);
      addLog(
        '테스트 연산 중 오류 발생',
        'FAIL',
        error instanceof Error ? error.message : '알 수 없는 오류',
      );
    } finally {
      setLogs(testLogs);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>C++ Native RSA 결정론 검증</Text>

      <TouchableOpacity
        style={[styles.testButton, loading && styles.disabledButton]}
        onPress={runRsaTest}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.testButtonText}>
            🧪 RSA 결정론적 키 생성 검증 실행
          </Text>
        )}
      </TouchableOpacity>

      <ScrollView style={styles.logContainer}>
        {logs.map((log, index) => (
          <View
            key={index}
            style={[
              styles.logItem,
              log.status === 'SUCCESS' && styles.successLog,
              log.status === 'FAIL' && styles.failLog,
              log.status === 'INFO' && styles.infoLog,
            ]}>
            <Text style={styles.logTitle}>{log.title}</Text>
            <Text style={styles.logDetail}>{log.detail}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logContainer: {
    flex: 1,
  },
  logItem: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 5,
  },
  infoLog: {
    backgroundColor: '#f1f5f9',
    borderLeftColor: '#64748b',
  },
  successLog: {
    backgroundColor: '#f0fdf4',
    borderLeftColor: '#22c55e',
  },
  failLog: {
    backgroundColor: '#fef2f2',
    borderLeftColor: '#ef4444',
  },
  logTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
  },
  logDetail: {
    fontSize: 13,
    color: '#475569',
    fontFamily: 'Platform',
    lineHeight: 18,
  },
});
