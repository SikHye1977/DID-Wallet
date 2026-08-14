import {useEffect} from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';

import {
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  requestPermission,
  onTokenRefresh,
} from '@react-native-firebase/messaging';

import {setItem} from '../utils/storage/AsyncStorage';
import {navigationRef} from '../navigation/navigationRef';

const FCM_TOKEN_KEY = 'fcmToken';

export const useFcmNotification = () => {
  const handleNotification = (remoteMessage: any) => {
    const targetUrl = remoteMessage?.data?.target_url;

    console.log(
      '🎯 [FCM target_url]:',
      targetUrl,
    );

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

    const requestNotificationPermission = async () => {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const result =
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            );

          console.log(
            '🔔 [Android Notification Permission]:',
            result,
          );

          return;
        }

        return;
      }

      const authStatus =
        await requestPermission(messaging);

      console.log(
        '🔔 [iOS Notification Permission]:',
        authStatus,
      );
    };

    const initFcm = async () => {
      try {
        await requestNotificationPermission();

        const token = await getToken(messaging);

        console.log(
          '🔑 [FCM Token]:',
          token,
        );

        await setItem(
          FCM_TOKEN_KEY,
          token,
        );
      } catch (error) {
        console.error(
          '❌ FCM 초기화 에러:',
          error,
        );
      }
    };

    initFcm();

    const unsubscribeTokenRefresh =
      onTokenRefresh(
        messaging,
        async token => {
          console.log(
            '🔄 [FCM Token Refreshed]:',
            token,
          );

          await setItem(
            FCM_TOKEN_KEY,
            token,
          );

          // 이후 Backend deviceToken 업데이트 API 필요
        },
      );

    const unsubscribeOnMessage =
      onMessage(
        messaging,
        async remoteMessage => {
          console.log(
            '📩 [Foreground FCM]:',
            remoteMessage,
          );

          Alert.alert(
            remoteMessage.notification?.title ??
              'VC 알림',
            remoteMessage.notification?.body ??
              'VC 요청이 도착했습니다.',
            [
              {
                text: '취소',
                style: 'cancel',
              },
              {
                text: '확인',
                onPress: () =>
                  handleNotification(remoteMessage),
              },
            ],
          );
        },
      );

    const unsubscribeOpened =
      onNotificationOpenedApp(
        messaging,
        remoteMessage => {
          console.log(
            '👆 [Background FCM Click]:',
            remoteMessage,
          );

          handleNotification(remoteMessage);
        },
      );

    getInitialNotification(messaging).then(
      remoteMessage => {
        if (!remoteMessage) {
          return;
        }

        console.log(
          '🚀 [Quit FCM Click]:',
          remoteMessage,
        );

        handleNotification(remoteMessage);
      },
    );

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeOnMessage();
      unsubscribeOpened();
    };
  }, []);
};