// App.tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import {navigationRef} from './src/navigation/navigationRef';
import {useFcmNotification} from './src/hooks/useFcmNotification';

// 딥링크 구성
const linking = {
  prefixes: ['uxmwallet://'],
  config: {
    screens: {
      Auth: 'auth',
    },
  },
};

function App() {
  // FCM 알림 수신 훅 실행
  useFcmNotification();

  return (
    <NavigationContainer linking={linking} ref={navigationRef}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default App;
