// src/navigation/RootNavigator.tsx
import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

import HomeScreen from '../screen/HomeScreen';
import ProfileScreen from '../screen/ProfileScreen';
import CameraScreen from '../screen/CameraScreen';
import TestRegisterScreen from '../screen/TestRegisterScreen';
import AuthScreen from '../screen/AuthScreen';
import TicketDetailScreen from '../screen/TicketDetailScreen';

import {RootStackParamList, MainTabParamList} from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({route}) => ({
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          height: 100,
          paddingBottom: 20,
          paddingTop: 8,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string = 'help-outline';

          if (route.name === 'Home') {
            iconName = focused ? 'ticket' : 'ticket-outline';
          } else if (route.name === 'Camera') {
            iconName = focused ? 'camera' : 'camera-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{title: '티켓 관리'}}
      />
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{
          title: '카메라',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: '프로필'}}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="MainTabs">
      <Stack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{title: 'DID Auth'}}
      />
      <Stack.Screen
        name="Test"
        component={TestRegisterScreen}
        options={{title: '네이티브 RSA 테스트'}}
      />
      <Stack.Screen
        name="TicketDetail"
        component={TicketDetailScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
}
