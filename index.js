/**
 * @format
 */
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import {Buffer} from 'buffer';
global.Buffer = global.Buffer || Buffer;

import {AppRegistry} from 'react-native';

import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

// FCM
const messaging = getMessaging();

// FCM
setBackgroundMessageHandler(
  messaging,
  async remoteMessage => {
    console.log(
      '📩 [Background FCM Received]:',
      remoteMessage,
    );
  },
);

import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
