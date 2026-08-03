import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import HomeScreen from './src/screen/HomeScreen';
import ProfileScreen from './src/screen/ProfileScreen';
import CameraScreen from './src/screen/CameraScreen';
import TestRegisterScreen from './src/screen/TestRegisterScreen';
import AuthScreen from './src/screen/AuthScreen';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['uxmwallet://'],
  config: {
    screens: {
      Auth: {
        path: 'auth',
      },
    },
  },
};

function App() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Test" component={TestRegisterScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen
          name="CameraScreen"
          component={CameraScreen}
          options={{headerShown: false}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
