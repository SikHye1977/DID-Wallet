import {useEffect} from 'react';
import {Alert, PermissionsAndroid, Platform} from 'react-native';

import {
  AuthorizationStatus,
  getAPNSToken,
  getInitialNotification,
  getMessaging,
  getToken,
  isDeviceRegisteredForRemoteMessages,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
} from '@react-native-firebase/messaging';

import {setItem} from '../utils/storage/AsyncStorage';
import {navigationRef} from '../navigation/navigationRef';

const FCM_TOKEN_KEY = 'fcmToken';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * iOS에서 APNs Device Token 발급을 기다린다.
 *
 * registerDeviceForRemoteMessages() 호출 직후에도
 * APNs Token이 즉시 준비되지 않을 수 있기 때문에
 * 최대 약 10초 동안 확인한다.
 */
const waitForApnsToken = async (
  messaging: ReturnType<typeof getMessaging>,
): Promise<string | null> => {
  const MAX_RETRY = 20;
  const RETRY_DELAY_MS = 500;

  for (let i = 0; i < MAX_RETRY; i += 1) {
    const apnsToken = await getAPNSToken(messaging);

    if (apnsToken) {
      return apnsToken;
    }

    await sleep(RETRY_DELAY_MS);
  }

  return null;
};

export const useFcmNotification = () => {
  /**
   * FCM data의 target_url 처리
   */
  const handleNotification = (remoteMessage: any) => {
    const targetUrl = remoteMessage?.data?.target_url;

    console.log('🎯 [FCM] target_url 존재:', !!targetUrl);

    if (!targetUrl) {
      return;
    }

    if (navigationRef.isReady()) {
      navigationRef.navigate('MainTabs', {
        screen: 'Home',
        params: {
          targetUrl,
        },
      });
    }
  };

  useEffect(() => {
    const messaging = getMessaging();

    /**
     * ======================================================
     * 알림 권한 요청
     * ======================================================
     */
    const requestNotificationPermission = async (): Promise<boolean> => {
      // ---------------------------------------------------
      // Android
      // ---------------------------------------------------

      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );

          console.log('🔔 [Android Notification Permission]:', result);

          return result === PermissionsAndroid.RESULTS.GRANTED;
        }

        return true;
      }

      // ---------------------------------------------------
      // iOS
      // ---------------------------------------------------

      const authStatus = await requestPermission(messaging);

      console.log('🔔 [iOS Notification Permission]:', authStatus);

      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.warn('⚠️ [FCM] iOS 알림 권한이 허용되지 않았습니다.');
      }

      return enabled;
    };

    /**
     * ======================================================
     * FCM 초기화
     * ======================================================
     */
    const initFcm = async () => {
      try {
        // ---------------------------------------------------
        // 1. 알림 권한 요청
        // ---------------------------------------------------

        const permissionGranted = await requestNotificationPermission();

        if (!permissionGranted) {
          return;
        }

        // ---------------------------------------------------
        // 2. iOS APNs 등록
        // ---------------------------------------------------

        if (Platform.OS === 'ios') {
          const isRegistered = isDeviceRegisteredForRemoteMessages(messaging);

          console.log('🍎 [FCM] Remote Message 등록 상태:', isRegistered);

          if (!isRegistered) {
            console.log('🍎 [FCM] Remote Message 등록 중...');

            await registerDeviceForRemoteMessages(messaging);

            console.log('✅ [FCM] Remote Message 등록 완료');
          }

          // -------------------------------------------------
          // 3. APNs Token 발급 대기
          // -------------------------------------------------

          console.log('🍎 [FCM] APNs Token 대기 중...');

          const apnsToken = await waitForApnsToken(messaging);

          if (!apnsToken) {
            console.warn('⚠️ [FCM] APNs Token을 얻지 못했습니다.');

            return;
          }

          console.log('✅ [FCM] APNs Token 발급 확인');
        }

        // ---------------------------------------------------
        // 4. FCM Token 발급
        // ---------------------------------------------------

        const token = await getToken(messaging);

        if (!token) {
          throw new Error('FCM Token이 비어 있습니다.');
        }

        console.log('✅ [FCM] FCM Token 발급 완료');

        // 전체 token은 로그에 남기지 않는다.
        await setItem(FCM_TOKEN_KEY, token);

        console.log('✅ [FCM] FCM Token 저장 완료');
      } catch (error) {
        console.error('❌ FCM 초기화 에러:', error);
      }
    };

    initFcm();

    /**
     * ======================================================
     * FCM Token Refresh
     * ======================================================
     */
    const unsubscribeTokenRefresh = onTokenRefresh(messaging, async token => {
      console.log('🔄 [FCM] Token Refresh 발생');

      try {
        await setItem(FCM_TOKEN_KEY, token);

        console.log('✅ [FCM] 갱신 Token 저장 완료');

        // TODO:
        // Backend에 변경된 deviceToken 업데이트
      } catch (error) {
        console.error('❌ [FCM] 갱신 Token 저장 실패:', error);
      }
    });

    /**
     * ======================================================
     * Foreground Notification
     * ======================================================
     */
    const unsubscribeOnMessage = onMessage(messaging, async remoteMessage => {
      console.log('📩 [FCM] Foreground 메시지 수신');

      Alert.alert(
        remoteMessage.notification?.title ?? 'VC 알림',

        remoteMessage.notification?.body ?? 'VC 요청이 도착했습니다.',

        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '확인',
            onPress: () => handleNotification(remoteMessage),
          },
        ],
      );
    });

    /**
     * ======================================================
     * Background 상태에서 알림 클릭
     * ======================================================
     */
    const unsubscribeOpened = onNotificationOpenedApp(
      messaging,
      remoteMessage => {
        console.log('👆 [FCM] Background 알림 클릭');

        handleNotification(remoteMessage);
      },
    );

    /**
     * ======================================================
     * Quit 상태에서 알림 클릭
     * ======================================================
     */
    getInitialNotification(messaging)
      .then(remoteMessage => {
        if (!remoteMessage) {
          return;
        }

        console.log('🚀 [FCM] Quit 상태 알림으로 앱 실행');

        handleNotification(remoteMessage);
      })
      .catch(error => {
        console.error('❌ [FCM] Initial Notification 확인 실패:', error);
      });

    /**
     * ======================================================
     * Cleanup
     * ======================================================
     */
    return () => {
      unsubscribeTokenRefresh();
      unsubscribeOnMessage();
      unsubscribeOpened();
    };
  }, []);
};
