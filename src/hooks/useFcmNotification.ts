import {useEffect} from 'react';
import {
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  requestPermission,
  getToken,
} from '@react-native-firebase/messaging';
import {setItem} from '../utils/storage/AsyncStorage';
import {navigationRef} from '../navigation/navigationRef';

const FCM_TOKEN_KEY = 'fcmToken';

export const useFcmNotification = () => {
  const handleNotification = async (remoteMessage: any) => {
    const targetUrl = remoteMessage?.data?.target_url;
    if (targetUrl) {
      console.log('🔄 [FCM VC 발급 요청 URL]:', targetUrl);
      if (navigationRef.isReady()) {
        navigationRef.navigate('MainTabs', {
          screen: 'Home',
          params: {targetUrl},
        });
      }
    }
  };

  useEffect(() => {
    // 💡 네이티브 모듈 초기화 완료 후 safe point에서 messaging 인스턴스를 가져옵니다.
    const messagingEl = getMessaging();

    // 1. 권한 요청 및 FCM 토큰 수신
    const initFcm = async () => {
      try {
        const authStatus = await requestPermission(messagingEl);
        if (authStatus) {
          const token = await getToken(messagingEl);
          console.log('🔑 [iOS Simulator FCM Token]:', token);
          await setItem(FCM_TOKEN_KEY, token);
        }
      } catch (error) {
        console.error('❌ FCM 토큰 발급 에러:', error);
      }
    };

    initFcm();

    // 2. Foreground 수신
    const unsubscribeOnMessage = onMessage(
      messagingEl,
      async (remoteMessage: any) => {
        console.log('📩 [Foreground FCM]:', remoteMessage);
        handleNotification(remoteMessage);
      },
    );

    // 3. Background 알림 클릭
    const unsubscribeOnNotificationOpened = onNotificationOpenedApp(
      messagingEl,
      (remoteMessage: any) => {
        console.log('👆 [Background FCM Click]:', remoteMessage);
        handleNotification(remoteMessage);
      },
    );

    // 4. Quit 상태 클릭
    getInitialNotification(messagingEl).then((remoteMessage: any) => {
      if (remoteMessage) {
        console.log('🚀 [Quit FCM Click]:', remoteMessage);
        handleNotification(remoteMessage);
      }
    });

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpened();
    };
  }, []);
};
