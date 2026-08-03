import React, {useState, useEffect, useRef} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import {PoolCreate} from '@hyperledger/indy-vdr-react-native';

// 1. 기존 DIDGenerator.ts 모듈 그대로 사용
import {
  setupIndyPool,
  generateSeparateKeyPairs,
  registerDID,
  sendSingleAttrib,
} from '../utils/DIDGenerator';

// 2. RSAUtils.ts에서 네이티브 RSA 키 생성 함수 직접 import
import {generateNativeRSAKeyPair} from '../utils/RSAUtils';

const SUBMITTER_DID = 'J4BALc9uEa8F1GCy7uka7f';

export default function TestRegisterScreen() {
  const camera = useRef<Camera>(null);
  const device = useCameraDevice('front');
  const {hasPermission, requestPermission} = useCameraPermission();

  const [pool, setPool] = useState<PoolCreate | null>(null);
  const [keyInfo, setKeyInfo] = useState<any>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    const init = async () => {
      if (!hasPermission) {
        await requestPermission();
      }

      addLog('🌐 Indy Pool 접속 중...');
      const indyPool = await setupIndyPool();
      if (indyPool) {
        setPool(indyPool);
        addLog('✅ Pool 접속 완료!');
      } else {
        addLog('❌ Pool 접속 실패');
      }
    };
    init();
  }, [hasPermission]);

  // 사진 촬영 후 키 쌍 종합 생성
  const handleTakePhoto = async () => {
    if (!camera.current) return;

    try {
      setIsProcessing(true);
      addLog('📸 얼굴 사진 촬영 중...');

      const photo = await camera.current.takePhoto({
        enableShutterSound: false,
      });

      setPhotoPath(`file://${photo.path}`);
      setIsCameraActive(false);
      addLog('✅ 사진 촬영 완료!');

      // 1) DIDGenerator.ts 에서 Ed25519 & X25519 키 생성
      addLog('🔑 Ed25519, X25519 키 쌍 및 DID 생성 중...');
      const baseKeys = await generateSeparateKeyPairs();

      // 2) RSAUtils.ts 에서 네이티브 쓰레드로 RSA 2048 키 빠른 생성 (0.1초)
      addLog('⚡ 네이티브 쓰레드(RSAUtils)에서 RSA 2048 키 생성 중...');
      const rsaKeys = await generateNativeRSAKeyPair();

      // 3) 키 객체 통합 저장
      setKeyInfo({
        ...baseKeys,
        rsaPublicKey: rsaKeys.publicKey,
        rsaPrivateKey: rsaKeys.privateKey,
      });

      addLog(`✅ Target DID 생성 완료: ${baseKeys.did}`);
      addLog('✅ 네이티브 RSA 2048-bit 키 쌍 생성 완료!');
    } catch (error) {
      console.error(error);
      addLog('❌ 촬영 및 키 생성 실패');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 1: NYM 등록 (DIDGenerator 사용)
  const handleRegisterNym = async () => {
    if (!pool || !keyInfo) return;
    addLog('🔄 [Step 1] NYM 트랜잭션 전송 중...');
    const res = await registerDID(
      pool,
      SUBMITTER_DID,
      keyInfo.did,
      keyInfo.edPublicKey,
    );
    if (res) addLog('🎉 [Step 1 성공] NYM DID 등록 완료!');
    else addLog('❌ [Step 1 실패] NYM 등록 오류');
  };

  // Step 2: X25519 ATTRIB 등록 (DIDGenerator 사용)
  const handleRegisterX25519 = async () => {
    if (!pool || !keyInfo) return;
    addLog('🔄 [Step 2] X25519 공개키 ATTRIB 등록 중...');
    const res = await sendSingleAttrib(
      pool,
      keyInfo.did,
      keyInfo.did,
      {'x25519-public-key': keyInfo.x25519PublicKey},
      keyInfo.edPrivateKey,
    );
    if (res) addLog('🎉 [Step 2 성공] X25519 ATTRIB 등록 완료!');
    else addLog('❌ [Step 2 실패] X25519 ATTRIB 등록 오류');
  };

  // Step 3: RSAUtils로 생성한 RSA 공개키 ATTRIB 등록 (DIDGenerator 사용)
  const handleRegisterRsa = async () => {
    if (!pool || !keyInfo || !keyInfo.rsaPublicKey) return;

    const cleanRsaKey = keyInfo.rsaPublicKey
      .replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----/g, '')
      .replace(/\r?\n|\r/g, '')
      .trim();

    addLog('🔄 [Step 3] 네이티브 RSA 공개키 ATTRIB 등록 중...');
    const res = await sendSingleAttrib(
      pool,
      keyInfo.did,
      keyInfo.did,
      {'rsa-public-key': cleanRsaKey},
      keyInfo.edPrivateKey,
    );
    if (res) addLog('🎉 [Step 3 성공] 네이티브 RSA ATTRIB 등록 완료!');
    else addLog('❌ [Step 3 실패] RSA ATTRIB 등록 오류');
  };

  if (isCameraActive && device) {
    return (
      <View style={styles.cameraContainer}>
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          photo={true}
        />
        <View style={styles.cameraOverlay}>
          <TouchableOpacity
            style={styles.shutterBtn}
            onPress={handleTakePhoto}
            disabled={isProcessing}>
            {isProcessing ? (
              <ActivityIndicator color="#000" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setIsCameraActive(false)}>
            <Text style={styles.closeBtnText}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🧪 네이티브 RSA DID 등록 테스트</Text>

      <View style={styles.photoContainer}>
        {photoPath ? (
          <Image source={{uri: photoPath}} style={styles.previewImage} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.placeholderText}>얼굴 사진 없음</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.cameraStartBtn}
          onPress={() => setIsCameraActive(true)}
          disabled={isProcessing}>
          <Text style={styles.cameraStartBtnText}>
            {photoPath ? '📸 사진 재촬영하기' : '📸 얼굴 촬영 및 키 생성'}
          </Text>
        </TouchableOpacity>
      </View>

      {keyInfo && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Target DID: {keyInfo.did}</Text>
          <Text style={styles.infoSubText}>
            Native RSA Key: {keyInfo.rsaPublicKey.slice(0, 35)}...
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.btn, styles.btnNym]}
          onPress={handleRegisterNym}
          disabled={!keyInfo}>
          <Text style={styles.btnText}>1. NYM 등록 (Step 1)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnX25519]}
          onPress={handleRegisterX25519}
          disabled={!keyInfo}>
          <Text style={styles.btnText}>2. X25519 ATTRIB 등록 (Step 2)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnRsa]}
          onPress={handleRegisterRsa}
          disabled={!keyInfo}>
          <Text style={styles.btnText}>3. RSA ATTRIB 등록 (Step 3)</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.logTitle}>📋 실시간 실행 로그</Text>
      <ScrollView style={styles.logBox}>
        {logs.map((log, i) => (
          <Text key={i} style={styles.logText}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f4f6f8', padding: 16},
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
    textAlign: 'center',
  },
  photoContainer: {alignItems: 'center', marginBottom: 10},
  previewImage: {width: 90, height: 90, borderRadius: 45, marginBottom: 8},
  photoPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeholderText: {fontSize: 11, color: '#475569'},
  cameraStartBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  cameraStartBtnText: {color: '#fff', fontSize: 13, fontWeight: 'bold'},
  infoBox: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  infoText: {fontSize: 12, color: '#333', fontWeight: 'bold'},
  infoSubText: {fontSize: 10, color: '#666', marginTop: 2},
  buttonContainer: {gap: 8, marginBottom: 12},
  btn: {padding: 12, borderRadius: 8, alignItems: 'center'},
  btnNym: {backgroundColor: '#2563eb'},
  btnX25519: {backgroundColor: '#0d9488'},
  btnRsa: {backgroundColor: '#7c3aed'},
  btnText: {color: '#fff', fontSize: 14, fontWeight: 'bold'},
  logTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#4b5563',
  },
  logBox: {flex: 1, backgroundColor: '#1e293b', padding: 10, borderRadius: 8},
  logText: {
    color: '#38bdf8',
    fontSize: 11,
    marginBottom: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cameraContainer: {flex: 1, backgroundColor: '#000'},
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  shutterBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#000',
  },
  closeBtn: {position: 'absolute', top: 50, right: 20, padding: 10},
  closeBtnText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
});
