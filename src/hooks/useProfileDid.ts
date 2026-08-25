import {useState} from 'react';
import {
  Alert,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {
  generateSeparateKeyPairs,
  registerDID,
  addPublicKeysToAttrib,
  setupIndyPool,
} from '../utils/did/DIDGenerator';

import {DidData} from '../types/did';
import {useWalletStore} from '../store/useWalletStore';

// 26.08.18
// 에뮬레이터 테스트용
import { isAndroidEmulator } from '../utils/device/isAndroidEmulator';

const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * ============================================================
 * Android Emulator 임시 테스트 옵션
 * ============================================================
 *
 * true:
 *   Android에서
 *   Camera → Face API → Fuzzy Extractor → RSA
 *   과정을 건너뛰고
 *   DID + Ed25519 + X25519까지만 생성한다.
 *
 * false:
 *   Android에서도 기존 CameraScreen을 통한
 *   전체 생체 DID 생성 과정을 수행한다.
 *
 * Galaxy Tab 실기기에서 생체 DID를 테스트하기 시작하면
 * false로 변경하면 된다.
 */
const SKIP_FACE_ON_ANDROID_EMULATOR = false;

export const useProfileDid = () => {
  const navigation = useNavigation<any>();

  /**
   * ============================================================
   * Zustand Wallet Store
   * ============================================================
   */
  const {
    didList,
    selectedDid,
    setDidList,
    setSelectedDid,
  } = useWalletStore();

  const [isRegistering, setIsRegistering] =
    useState<boolean>(false);

  /**
   * ============================================================
   * 1. DID 선택
   * ============================================================
   */
  const handleSelectDid = (item: DidData) => {
    setSelectedDid(item);
  };

  /**
   * ============================================================
   * 2. 새 DID 생성
   * ============================================================
   *
   * iOS / 정상 흐름
   *
   * generateSeparateKeyPairs()
   *          ↓
   * CameraScreen
   *          ↓
   * 얼굴 촬영
   *          ↓
   * Face API
   *          ↓
   * Fuzzy Extractor
   *          ↓
   * RSA 생성
   *          ↓
   * Zustand 저장
   *
   *
   * Android Emulator 현재 흐름
   *
   * generateSeparateKeyPairs()
   *          ↓
   * DID
   * Ed25519
   * X25519
   *          ↓
   * Zustand 저장
   *
   * Camera / Face / FE / RSA는 SKIP
   */
  const createDid = async () => {
    try {
      console.log('');
      console.log(
        '============================================================',
      );
      console.log(
        '🚀 [DID Generator] DID / Key 생성 시작',
      );
      console.log(
        '============================================================',
      );

      /**
       * DID + Ed25519 + X25519 생성
       */
      const resultDid =
        await generateSeparateKeyPairs();

      /**
       * --------------------------------------------------------
       * 생성 결과 확인
       * --------------------------------------------------------
       *
       * Private Key 실제 값은 출력하지 않는다.
       */
      console.log(
        '🔍 [DID KEY GENERATION CHECK]',
      );

      console.log(
        ' - Platform:',
        Platform.OS,
      );

      console.log(
        ' - DID:',
        resultDid?.did,
      );

      console.log(
        ' - Ed25519 Public Key exists:',
        !!resultDid?.edPublicKey,
      );

      console.log(
        ' - Ed25519 Public Key length:',
        resultDid?.edPublicKey?.length,
      );

      console.log(
        ' - Ed25519 Private Key exists:',
        !!resultDid?.edPrivateKey,
      );

      console.log(
        ' - Ed25519 Private Key length:',
        resultDid?.edPrivateKey?.length,
      );

      console.log(
        ' - X25519 Public Key exists:',
        !!resultDid?.x25519PublicKey,
      );

      console.log(
        ' - X25519 Public Key length:',
        resultDid?.x25519PublicKey?.length,
      );

      console.log(
        ' - X25519 Private Key exists:',
        !!resultDid?.x25519PrivateKey,
      );

      console.log(
        ' - X25519 Private Key length:',
        resultDid?.x25519PrivateKey?.length,
      );

      console.log(
        '============================================================',
      );

      /**
       * 필수 DID / Key 생성 여부 확인
       */
      if (
        !resultDid?.did ||
        !resultDid?.edPublicKey ||
        !resultDid?.edPrivateKey ||
        !resultDid?.x25519PublicKey ||
        !resultDid?.x25519PrivateKey
      ) {
        throw new Error(
          'DID 또는 필수 키 생성 결과가 누락되었습니다.',
        );
      }

      /**
       * ========================================================
       * Android Emulator 임시 DID 생성
       * ========================================================
       *
       * RSA / HelperData는 아직 생성하지 않는다.
       *
       * 하지만 이 DID도:
       *
       * - NYM
       * - Ed25519 Public Key
       * - X25519 Public Key
       *
       * 까지는 정상적으로 원장에 등록할 수 있도록 한다.
       */
      const isEmulator = 
        Platform.OS === 'android' &&
        isAndroidEmulator();

      if (isEmulator) {
        console.log('');
        console.log(
          '🧪 [Android Emulator] 생체 키 생성 단계 SKIP',
        );

        console.log(
          ' - Camera: SKIP',
        );

        console.log(
          ' - Face API: SKIP',
        );

        console.log(
          ' - Fuzzy Extractor: SKIP',
        );

        console.log(
          ' - RSA Generation: SKIP',
        );

        /**
         * Android Emulator용 DidData
         *
         * rsaPublicKey 없음
         * helperData 없음
         *
         * → 현재 단계에서는 정상
         */
        const newTestDid: DidData = {
          did: resultDid.did,

          edVerkey:
            resultDid.edPublicKey,

          edSecretkey:
            resultDid.edPrivateKey,

          xVerkey:
            resultDid.x25519PublicKey,

          xSecretkey:
            resultDid.x25519PrivateKey,

          alias: 'Android 테스트 DID',

          createdAt: Date.now(),

          isRegistered: false,
        };

        /**
         * ------------------------------------------------------
         * Store 저장 직전 검증
         * ------------------------------------------------------
         */
        console.log('');
        console.log(
          '========== [DID STORE CHECK] ==========',
        );

        console.log(
          'DID:',
          newTestDid.did,
        );

        console.log(
          'edVerkey exists:',
          !!newTestDid.edVerkey,
        );

        console.log(
          'edVerkey length:',
          newTestDid.edVerkey?.length,
        );

        console.log(
          'edSecretkey exists:',
          !!newTestDid.edSecretkey,
        );

        console.log(
          'edSecretkey length:',
          newTestDid.edSecretkey?.length,
        );

        console.log(
          'xVerkey exists:',
          !!newTestDid.xVerkey,
        );

        console.log(
          'xVerkey length:',
          newTestDid.xVerkey?.length,
        );

        console.log(
          'xSecretkey exists:',
          !!newTestDid.xSecretkey,
        );

        console.log(
          'xSecretkey length:',
          newTestDid.xSecretkey?.length,
        );

        console.log(
          'rsaPublicKey exists:',
          !!newTestDid.rsaPublicKey,
        );

        console.log(
          'helperData exists:',
          !!newTestDid.helperData,
        );

        console.log(
          '=======================================',
        );

        /**
         * 최신 Zustand 상태 사용
         */
        const currentList =
          useWalletStore.getState().didList;

        const updatedList = [
          ...currentList,
          newTestDid,
        ];

        useWalletStore
          .getState()
          .setDidList(updatedList);

        useWalletStore
          .getState()
          .setSelectedDid(newTestDid);

        console.log(
          '✅ [Android Emulator] DID Zustand 저장 완료',
        );

        console.log(
          '✅ [Android Emulator] NYM/X25519 등록 가능 상태',
        );

        Alert.alert(
          'DID 생성 완료',
          'Android 에뮬레이터용 DID와 Ed25519/X25519 키가 생성되었습니다.\n\nRSA 및 안면 인증 데이터는 추후 생성합니다.',
        );

        return;
      }

      /**
       * ========================================================
       * 기존 생체 DID 생성
       * ========================================================
       *
       * iOS에서는 그대로 실행.
       *
       * 나중에 Android 실기기에서
       * SKIP_FACE_ON_ANDROID_EMULATOR = false
       * 로 변경하면 Android도 이 경로 사용.
       */
      console.log(
        '📷 [DID Generator] CameraScreen 이동',
      );

      navigation.navigate(
        'Camera',
        {
          mode: 'GENERATE',
          pendingDidKeys: resultDid,
        },
      );
    } catch (error) {
      console.error(
        '❌ [DID Generator] DID 및 키 생성 실패:',
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : 'DID 및 키 생성 중 알 수 없는 오류가 발생했습니다.';

      Alert.alert(
        '생성 실패',
        message,
      );
    }
  };

  /**
   * ============================================================
   * 3. Indy 원장 등록
   * ============================================================
   *
   * 현재 필수 등록 대상:
   *
   * NYM
   * ├─ DID
   * └─ Ed25519 Public Key
   *
   * ATTRIB
   * └─ X25519 Public Key
   *
   *
   * 선택 등록 대상:
   *
   * ATTRIB
   * ├─ RSA Public Key
   * └─ HelperData
   *
   * RSA / HelperData가 없어도 등록을 막지 않는다.
   */
  const registerDid = async () => {
    if (!selectedDid) {
      Alert.alert(
        '등록 실패',
        '선택된 DID가 없습니다.',
      );

      return;
    }

    /**
     * 현재 단계에서 반드시 필요한 키만 검사
     */
    if (!selectedDid.edVerkey) {
      Alert.alert(
        '등록 실패',
        'Ed25519 Public Key가 없습니다.',
      );

      return;
    }

    if (!selectedDid.xVerkey) {
      Alert.alert(
        '등록 실패',
        'X25519 Public Key가 없습니다.',
      );

      return;
    }

    setIsRegistering(true);

    try {
      /**
       * --------------------------------------------------------
       * Indy Pool 연결
       * --------------------------------------------------------
       */
      console.log('');
      console.log(
        '============================================================',
      );

      console.log(
        '🌐 [DID Register] Indy Pool 연결 시작',
      );

      const pool =
        await setupIndyPool();

      if (!pool) {
        Alert.alert(
          '등록 실패',
          'Indy Pool 연결에 실패했습니다.',
        );

        return;
      }

      console.log(
        '✅ [DID Register] Indy Pool 연결 완료',
      );

      /**
       * --------------------------------------------------------
       * STEP 1
       * NYM 등록
       * --------------------------------------------------------
       */
      console.log(
        '🔄 [Step 1] NYM 트랜잭션 전송 중...',
      );

      console.log(
        ' - DID:',
        selectedDid.did,
      );

      console.log(
        ' - Ed25519 Public Key exists:',
        !!selectedDid.edVerkey,
      );

      console.log(
        ' - Ed25519 Public Key length:',
        selectedDid.edVerkey?.length,
      );

      const registerResponse =
        await registerDID(
          pool,

          /**
           * Trustee DID
           */
          'J4BALc9uEa8F1GCy7uka7f',

          selectedDid.did,

          selectedDid.edVerkey,
        );

      if (!registerResponse) {
        Alert.alert(
          '등록 실패',
          'DID(NYM) 등록에 실패했습니다.',
        );

        return;
      }

      console.log(
        '✅ [Step 1] NYM 트랜잭션 완료',
      );

      console.log(
        '⏳ 노드 합의 대기 중 (1.5초)...',
      );

      await sleep(1500);

      /**
       * --------------------------------------------------------
       * RSA Public Key
       * --------------------------------------------------------
       *
       * 현재는 없어도 정상.
       *
       * 존재하는 경우에만 PEM header/footer 제거.
       */
      let formattedRsaKey:
        | string
        | undefined =
        selectedDid.rsaPublicKey;

      if (formattedRsaKey) {
        formattedRsaKey =
          formattedRsaKey
            .replace(
              /-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----/g,
              '',
            )
            .replace(
              /\r?\n|\r/g,
              '',
            )
            .trim();
      }

      /**
       * --------------------------------------------------------
       * 현재 등록할 ATTRIB 상태 출력
       * --------------------------------------------------------
       */
      console.log('');
      console.log(
        '🔍 [ATTRIB DATA CHECK]',
      );

      console.log(
        ' - X25519 Public Key exists:',
        !!selectedDid.xVerkey,
      );

      console.log(
        ' - X25519 Public Key length:',
        selectedDid.xVerkey?.length,
      );

      console.log(
        ' - RSA Public Key exists:',
        !!formattedRsaKey,
      );

      console.log(
        ' - HelperData exists:',
        !!selectedDid.helperData,
      );

      /**
       * --------------------------------------------------------
       * STEP 2
       * ATTRIB 등록
       * --------------------------------------------------------
       *
       * 반드시 등록:
       * - X25519 Public Key
       *
       * 있으면 등록:
       * - RSA Public Key
       * - HelperData
       */
      console.log(
        '🔄 [Step 2] ATTRIB 등록 시작',
      );

      const attribResponse =
        await addPublicKeysToAttrib(
          pool,

          /**
           * Submitter DID
           */
          selectedDid.did,

          /**
           * Target DID
           */
          selectedDid.did,

          /**
           * 필수
           */
          selectedDid.xVerkey,

          /**
           * 선택
           */
          formattedRsaKey,

          /**
           * 기존 함수 구조 유지
           */
          selectedDid.edSecretkey || '',

          /**
           * 선택
           */
          selectedDid.helperData,
        );

      if (!attribResponse) {
        Alert.alert(
          '등록 실패',
          'ATTRIB 공개키 등록에 실패했습니다.',
        );

        return;
      }

      console.log(
        '✅ [Step 2] ATTRIB 등록 완료',
      );

      /**
       * --------------------------------------------------------
       * Zustand 등록 상태 업데이트
       * --------------------------------------------------------
       */
      const updatedDid: DidData = {
        ...selectedDid,
        isRegistered: true,
      };

      const currentList =
        useWalletStore.getState().didList;

      const updatedList =
        currentList.map(item =>
          item.did === selectedDid.did
            ? {
                ...item,
                isRegistered: true,
              }
            : item,
        );

      setDidList(updatedList);
      setSelectedDid(updatedDid);

      console.log(
        '============================================================',
      );

      console.log(
        '🎉 [DID Register] 원장 등록 완료',
      );

      console.log(
        ' - NYM: ✅',
      );

      console.log(
        ' - X25519 ATTRIB: ✅',
      );

      console.log(
        ` - RSA ATTRIB: ${
          formattedRsaKey
            ? '✅'
            : 'SKIP'
        }`,
      );

      console.log(
        ` - HelperData: ${
          selectedDid.helperData
            ? '✅'
            : 'SKIP'
        }`,
      );

      console.log(
        '============================================================',
      );

      Alert.alert(
        '등록 성공',
        `DID(${selectedDid.alias || 'DID'})가 원장에 정상 등록되었습니다!`,
      );
    } catch (error) {
      console.error(
        '❌ [DID Register] 등록 과정 실패:',
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : '트랜잭션 중 알 수 없는 오류가 발생했습니다.';

      Alert.alert(
        '등록 실패',
        message,
      );
    } finally {
      setIsRegistering(false);
    }
  };

  /**
   * ============================================================
   * 4. DID 삭제
   * ============================================================
   */
  const removeDid = async () => {
    if (!selectedDid) {
      return;
    }

    try {
      const currentList =
        useWalletStore.getState().didList;

      const updatedList =
        currentList.filter(
          item =>
            item.did !== selectedDid.did,
        );

      setDidList(updatedList);

      /**
       * 삭제한 DID가 selectedDid였으므로
       * 남은 DID 중 첫 번째를 자동 선택.
       */
      setSelectedDid(
        updatedList.length > 0
          ? updatedList[0]
          : null,
      );

      console.log(
        '✅ [DID Delete] DID 삭제 완료:',
        selectedDid.did,
      );

      Alert.alert(
        '삭제 성공',
        '선택한 DID가 삭제되었습니다.',
      );
    } catch (error) {
      console.error(
        '❌ [DID Delete] 삭제 실패:',
        error,
      );

      Alert.alert(
        '삭제 실패',
        'DID 삭제 중 오류가 발생했습니다.',
      );
    }
  };

  /**
   * ============================================================
   * 5. DID Alias 수정
   * ============================================================
   */
  const updateAlias = async (
    newAlias: string,
  ) => {
    if (!selectedDid) {
      return;
    }

    try {
      const updatedDid: DidData = {
        ...selectedDid,
        alias: newAlias,
      };

      const currentList =
        useWalletStore.getState().didList;

      const updatedList =
        currentList.map(item =>
          item.did === selectedDid.did
            ? {
                ...item,
                alias: newAlias,
              }
            : item,
        );

      setDidList(updatedList);
      setSelectedDid(updatedDid);

      console.log(
        '✅ [DID Alias] 별칭 수정 완료',
      );
    } catch (error) {
      console.error(
        '❌ [DID Alias] 별칭 수정 실패:',
        error,
      );

      throw error;
    }
  };

  /**
   * ============================================================
   * Hook Export
   * ============================================================
   */
  return {
    didList,
    selectedDid,
    isRegistering,

    handleSelectDid,
    createDid,
    registerDid,
    removeDid,
    updateAlias,
  };
};