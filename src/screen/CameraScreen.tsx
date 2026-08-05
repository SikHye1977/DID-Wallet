import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import {useIsFocused, useNavigation, useRoute} from '@react-navigation/native';

// ✅ react-native-config 대신 @env 모듈 사용
import {FACE_API_TOKEN} from '@env';

// 🚀 기존 난수 기반 RSA 대신 C++ Native 결정론적 RSA 모듈 가져오기
import {generateDeterministicRSAKeyPair} from '../utils/DeterministicRSA';

import {setItem, getItem} from '../utils/AsyncStorage';
import {Generator} from '../utils/Fuzzy Extractor/FE_Generator';

/**
 * Face Embedding API
 *
 * GET  /health
 * POST /v1/embeddings
 *
 * POST 요청:
 * - Authorization: Bearer <TOKEN>
 * - multipart/form-data
 * - image: JPEG/PNG/WebP
 */
const FACE_API_BASE_URL = 'https://uxm.tailef369e.ts.net';
const FACE_EMBEDDING_URL = `${FACE_API_BASE_URL}/v1/embeddings`;

const FACE_API_TIMEOUT_MS = 30_000;

type CameraMode = 'QR' | 'GENERATE';

type FaceEmbeddingResponse = {
  dimension: number;
  face_count: number;
  embedding: number[];
};

type FaceApiErrorResponse = {
  detail?: string;
};

type PendingDidKeys = {
  did: string;
  edPublicKey: string;
  edPrivateKey: string;
  x25519PublicKey: string;
  x25519PrivateKey: string;
};

type CameraRouteParams = {
  mode?: CameraMode;
  pendingDidKeys?: PendingDidKeys;
  vp?: unknown;
};

/**
 * Vision Camera가 반환한 로컬 파일 경로를
 * React Native FormData에서 사용할 수 있는 URI로 변환한다.
 */
function normalizePhotoUri(photoPath: string): string {
  if (photoPath.startsWith('file://')) {
    return photoPath;
  }
  return `file://${photoPath}`;
}

/**
 * 🚀 실수(Float) 임베딩 벡터를 0 기준으로 이진화(Binarization)합니다.
 * - 0 이상: '1'
 * - 음수: '0'
 */
function binarizeEmbedding(embedding: number[]): string {
  return embedding.map(val => (val >= 0 ? '1' : '0')).join('');
}

/**
 * 서버 오류 상태와 detail을 사용자용 메시지로 변환한다.
 */
function getFaceApiErrorMessage(status: number, detail?: string): string {
  if (status === 400) {
    return '올바르지 않은 이미지입니다. 다시 촬영해주세요.';
  }

  if (status === 401) {
    return '얼굴 인증 서버의 인증 정보가 올바르지 않습니다.';
  }

  if (status === 413) {
    return '사진 크기 또는 해상도가 너무 큽니다.';
  }

  if (status === 415) {
    return '지원하지 않는 이미지 형식입니다.';
  }

  if (status === 422) {
    if (detail === 'No face detected') {
      return '사진에서 얼굴을 찾지 못했습니다. 정면을 바라보고 다시 촬영해주세요.';
    }

    if (detail === 'Multiple faces detected') {
      return '여러 명의 얼굴이 감지되었습니다. 한 명만 촬영해주세요.';
    }

    return detail ?? '사진에서 유효한 얼굴을 찾지 못했습니다.';
  }

  if (status >= 500) {
    return '얼굴 인증 서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }

  return detail ?? `서버 요청에 실패했습니다. HTTP ${status}`;
}

/**
 * 촬영된 사진을 Face Embedding API로 전송한다.
 */
async function requestFaceEmbedding(
  photoPath: string,
): Promise<FaceEmbeddingResponse> {
  const apiToken = FACE_API_TOKEN;

  if (!apiToken) {
    throw new Error('FACE_API_TOKEN이 설정되지 않았습니다.');
  }

  const imageUri = normalizePhotoUri(photoPath);

  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: 'face.jpg',
    type: 'image/jpeg',
  } as any);

  const abortController = new AbortController();

  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, FACE_API_TIMEOUT_MS);

  try {
    const response = await fetch(FACE_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: formData,
      signal: abortController.signal,
    });

    const responseText = await response.text();

    let responseBody: FaceEmbeddingResponse | FaceApiErrorResponse;

    try {
      responseBody = JSON.parse(responseText);
    } catch {
      throw new Error(
        `서버가 올바르지 않은 응답을 반환했습니다. HTTP ${response.status}`,
      );
    }

    if (!response.ok) {
      const errorBody = responseBody as FaceApiErrorResponse;
      throw new Error(
        getFaceApiErrorMessage(response.status, errorBody.detail),
      );
    }

    const result = responseBody as FaceEmbeddingResponse;

    if (result.dimension !== 256) {
      throw new Error(`예상하지 못한 임베딩 차원입니다: ${result.dimension}`);
    }

    if (!Array.isArray(result.embedding)) {
      throw new Error('서버 응답에 임베딩 배열이 없습니다.');
    }

    if (result.embedding.length !== 256) {
      throw new Error(
        `임베딩 길이가 올바르지 않습니다: ${result.embedding.length}`,
      );
    }

    console.log('====================================');
    console.log('✅ [CHECK 1] Face API 응답 성공');
    console.log(' - Dimension:', result.dimension);
    console.log(' - Vector Length:', result.embedding.length);
    console.log(' - Sample Vector (앞 5개):', result.embedding.slice(0, 5));
    console.log('====================================');

    if (
      !result.embedding.every(
        value => typeof value === 'number' && Number.isFinite(value),
      )
    ) {
      throw new Error('임베딩에 유효하지 않은 값이 포함되어 있습니다.');
    }

    if (result.face_count < 1) {
      throw new Error('사진에서 얼굴을 찾지 못했습니다.');
    }

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('얼굴 인증 서버 요청 시간이 초과되었습니다.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function CameraScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();

  const cameraRef = useRef<Camera>(null);

  const routeParams = (route.params ?? {}) as CameraRouteParams;

  const mode: CameraMode = routeParams.mode ?? 'QR';
  const pendingDidKeys = routeParams.pendingDidKeys;
  const vp = routeParams.vp;

  const isQrMode = mode === 'QR';
  const cameraPosition = isQrMode ? 'back' : 'front';

  const device = useCameraDevice(cameraPosition);
  const {hasPermission, requestPermission} = useCameraPermission();

  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState(
    '가이드라인에 얼굴을 맞추고 촬영하세요.',
  );

  useEffect(() => {
    const prepareCameraPermission = async () => {
      if (!hasPermission) {
        const granted = await requestPermission();

        if (!granted) {
          Alert.alert(
            '카메라 권한 필요',
            '얼굴 촬영과 QR 스캔을 위해 카메라 권한이 필요합니다.',
          );
        }
      }
    };

    prepareCameraPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    setScanned(false);
    setIsProcessing(false);

    if (!isQrMode) {
      setStatusText('가이드라인에 얼굴을 맞추고 촬영하세요.');
    }
  }, [isFocused, isQrMode]);

  // =========================================================
  // 1. QR 및 딥링크 처리
  // =========================================================

  const handleDeepLink = (url: string): boolean => {
    const SCHEME = 'uxmwallet://';

    if (!url.startsWith(SCHEME)) {
      return false;
    }

    try {
      const pathAndQuery = url.replace(SCHEME, '');
      const [path, queryString] = pathAndQuery.split('?');

      const params: {[key: string]: string} = {};

      if (queryString) {
        queryString.split('&').forEach(param => {
          const [key, value] = param.split('=');

          if (key && value) {
            params[key] = decodeURIComponent(value);
          }
        });
      }

      console.log(`[DeepLink] Path: ${path}, Params:`, params);

      if (path === 'ticket' || path.includes('ticket')) {
        if (params.targetUrl) {
          navigation.navigate('MainTabs', {
            screen: 'Ticket',
            params: {targetUrl: params.targetUrl},
          });
          return true;
        }
      }

      if (path === 'auth') {
        if (params.authRequestId) {
          navigation.navigate('Auth', {
            authRequestId: params.authRequestId,
          });
          return true;
        }
      }

      if (path === 'verify') {
        if (params.request_uri) {
          console.log('Verify DeepLink 감지:', params.request_uri);
          navigation.replace('Verify', {
            vp,
            requestUri: params.request_uri,
          });
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('딥링크 파싱 에러:', error);
      return false;
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],

    onCodeScanned: codes => {
      if (!isQrMode || scanned || codes.length === 0) {
        return;
      }

      const data = codes[0].value;

      if (!data) {
        return;
      }

      console.log('QR Scanned:', data);

      if (data.startsWith('openid-vc://')) {
        setScanned(true);

        try {
          const regex = /[?&]request_uri=([^&]+)/;
          const match = data.match(regex);

          if (match?.[1]) {
            const requestUri = decodeURIComponent(match[1]);

            navigation.replace('Verify', {
              vp,
              requestUri,
            });
            return;
          }
        } catch (error) {
          console.error('OID4VP 파싱 에러:', error);
        }
      }

      const isHandled = handleDeepLink(data);

      if (isHandled) {
        setScanned(true);

        setTimeout(() => {
          setScanned(false);
        }, 2000);

        return;
      }

      setScanned(true);

      Alert.alert('알림', `지원하지 않는 QR 코드입니다.\n데이터: ${data}`, [
        {
          text: '다시 스캔',
          onPress: () => setScanned(false),
        },
      ]);
    },
  });

  // =========================================================
  // 2. 얼굴 촬영 및 서버 전송
  // =========================================================

  const onCaptureFace = async (): Promise<void> => {
    if (!cameraRef.current || isProcessing) {
      return;
    }

    if (!pendingDidKeys) {
      Alert.alert(
        'DID 정보 오류',
        '생체 DID 생성에 필요한 DID 키 정보가 전달되지 않았습니다.',
      );
      return;
    }

    try {
      setIsProcessing(true);
      setStatusText('사진 촬영 중...');

      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
      });

      console.log('[VisionCamera] Photo path:', photo.path);

      setStatusText('얼굴 특징 벡터 생성 중...');

      const embeddingResult = await requestFaceEmbedding(photo.path);

      if (embeddingResult.face_count !== 1) {
        if (embeddingResult.face_count > 1) {
          throw new Error(
            '여러 명의 얼굴이 감지되었습니다. 혼자 나온 사진으로 다시 촬영해주세요.',
          );
        }
        throw new Error('사진에서 얼굴을 찾지 못했습니다.');
      }

      const embeddingVector = embeddingResult.embedding;

      console.log('[Face API] dimension:', embeddingResult.dimension);
      console.log('[Face API] face_count:', embeddingResult.face_count);
      console.log('[Face API] embedding length:', embeddingVector.length);

      setStatusText('Fuzzy Extractor 및 생체 키 생성 중...');

      // 🚀 256차원 Float 벡터 이진화 수행
      const binarizedInput = binarizeEmbedding(embeddingVector);

      // 🚀 이진화된 비트스트림 문자열을 Generator에 전달
      const feResult = await Generator(binarizedInput);

      if (!feResult?.key || !feResult?.helperData) {
        throw new Error('Fuzzy Extractor 결과가 올바르지 않습니다.');
      }

      setStatusText('C++ 백그라운드 결정론적 RSA 키 생성 중...');

      // 🚀 feResult.key를 SEED로 넘겨 C++ Native 백그라운드에서 RSA 공개키 유도
      const rsaResult = await generateDeterministicRSAKeyPair(feResult.key);

      console.log('[FE KEY CHECK]', {
        type: typeof feResult.key,
        length: feResult.key?.length,
        isBinary:
          typeof feResult.key === 'string' && /^[01]+$/.test(feResult.key),
        isHex:
          typeof feResult.key === 'string' &&
          /^[0-9a-fA-F]+$/.test(feResult.key),
      });

      // 📌 [LOG 3] 추출된 Key(R) 기반 RSA/DID 키 저장 확인
      console.log('====================================');
      console.log('✅ [CHECK 3] 생체 DID 키 바인딩 완료');
      console.log(' - Base Key (R):', feResult.key);
      console.log(' - Bound rsaPublicKey:', rsaResult.publicKey);
      console.log(' - Bound Fingerprint:', rsaResult.fingerprint);
      console.log(' - Bound HelperData:', feResult.helperData);
      console.log(' - Pending DID:', pendingDidKeys.did);
      console.log('====================================');

      const newBiometricDid = {
        did: pendingDidKeys.did,
        edVerkey: pendingDidKeys.edPublicKey,
        edSecretkey: pendingDidKeys.edPrivateKey,
        xVerkey: pendingDidKeys.x25519PublicKey,
        xSecretkey: pendingDidKeys.x25519PrivateKey,
        rsaPublicKey: rsaResult.publicKey, // 🚀 C++ Native에서 생성된 결정론적 RSA 공개키
        helperData: feResult.helperData,
        createdAt: Date.now(),
        alias: '안면 인증 DID',
        isRegistered: false,
      };

      const storedList = await getItem('DID_LIST');
      let currentList: any[] = [];

      if (storedList) {
        try {
          const parsed = JSON.parse(storedList);
          currentList = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          console.error('[DID_LIST] JSON 파싱 실패:', error);
          currentList = [];
        }
      }

      const updatedList = [...currentList, newBiometricDid];

      await setItem('DID_LIST', JSON.stringify(updatedList));
      await setItem('SELECTED_DID', JSON.stringify(newBiometricDid));

      setStatusText('생성 완료! 프로필 화면으로 이동합니다.');

      Alert.alert(
        '생성 완료',
        '안면 기반 생체 DID가 성공적으로 만들어졌습니다.',
        [
          {
            text: '확인',
            onPress: () => {
              navigation.navigate('MainTabs', {screen: 'Profile'});
            },
          },
        ],
        {cancelable: false},
      );
    } catch (error) {
      console.error('[Face Capture Error]', error);

      const message =
        error instanceof Error
          ? error.message
          : '안면 인식 DID 생성 중 알 수 없는 오류가 발생했습니다.';

      Alert.alert('안면 인증 실패', message);

      setIsProcessing(false);
      setStatusText('가이드라인에 얼굴을 맞추고 촬영하세요.');
    }
  };

  // =========================================================
  // 3. 권한 및 카메라 준비 상태
  // =========================================================

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.preparingText}>카메라 권한을 확인 중입니다...</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.preparingText}>카메라를 준비 중입니다...</Text>
      </View>
    );
  }

  // =========================================================
  // 4. UI
  // =========================================================

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused && !isProcessing}
        photo={!isQrMode}
        codeScanner={isQrMode ? codeScanner : undefined}
      />

      {/* QR 스캔 UI */}
      {isQrMode && (
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.scanFrame} />
          <Text style={styles.guideText}>QR 코드를 스캔하세요</Text>
        </View>
      )}

      {/* 얼굴 촬영 UI */}
      {!isQrMode && (
        <>
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.faceGuideFrame} />
          </View>

          <View style={styles.bottomContainer}>
            <Text style={styles.statusText}>{statusText}</Text>

            <TouchableOpacity
              style={[
                styles.captureButton,
                isProcessing && styles.disabledButton,
              ]}
              onPress={onCaptureFace}
              disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.captureButtonText}>촬영 및 DID 생성</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* 취소 버튼 */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
        disabled={isProcessing}>
        <Text style={styles.closeButtonText}>✕ 취소</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  preparingText: {
    color: '#ffffff',
    fontSize: 15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },

  // QR UI
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00ff00',
    backgroundColor: 'transparent',
    marginBottom: 20,
  },
  guideText: {
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    fontSize: 14,
  },

  // 얼굴 촬영 UI
  faceGuideFrame: {
    width: 260,
    height: 360,
    borderWidth: 3,
    borderColor: '#3b82f6',
    borderRadius: 180,
    backgroundColor: 'transparent',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 2,
  },
  statusText: {
    color: '#ffffff',
    marginBottom: 15,
    fontSize: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    textAlign: 'center',
  },
  captureButton: {
    backgroundColor: '#3b82f6',
    width: '80%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  disabledButton: {
    backgroundColor: '#555555',
  },
  captureButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },

  // 취소 버튼
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
