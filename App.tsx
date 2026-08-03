import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

// 스크린 컴포넌트 Import
import HomeScreen from './src/screen/HomeScreen';
import ProfileScreen from './src/screen/ProfileScreen';
import CameraScreen from './src/screen/CameraScreen';
import TestRegisterScreen from './src/screen/TestRegisterScreen';
import AuthScreen from './src/screen/AuthScreen';

// 타입 Import
import {RootStackParamList, MainTabParamList} from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// 🚀 하단 바텀 탭 내비게이터 컴포넌트
function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({route}) => ({
        tabBarActiveTintColor: '#3b82f6', // 선택된 탭 활성화 색상 (파란색)
        tabBarInactiveTintColor: '#94a3b8', // 선택 안 된 탭 색상 (회색)
        tabBarStyle: {
          height: 70, // 1. 전체 높이를 늘려 홈 바 공간을 충분히 확보
          paddingBottom: 20, // 2. 하단 여백을 대폭 주어 아이콘/글자를 위로 띄움
          paddingTop: 8, // 3. 상단 여백 조절
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        // 🚀 tabBarIcon에서 route.name과 focused 여부에 따라 Vector Icon 지정
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string = 'help-outline';

          if (route.name === 'Home') {
            // 티켓 관리 탭
            iconName = focused ? 'ticket' : 'ticket-outline';
          } else if (route.name === 'Camera') {
            // 안면 인증 탭
            iconName = focused ? 'camera' : 'camera-outline';
          } else if (route.name === 'Profile') {
            // 지갑 관리 탭
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}>
      {/* 1. 티켓 관리 메인 화면 */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{title: '티켓 관리'}}
      />

      {/* 2. 안면 촬영 카메라 화면 */}
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{
          title: '카메라',
          headerShown: false, // 카메라 스크린 전체 화면 사용
        }}
      />

      {/* 3. DID 지갑 관리 화면 */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{title: '프로필'}}
      />
    </Tab.Navigator>
  );
}

// 🚀 딥링크 구성 (uxmwallet://auth?authRequestId=... 매핑)
const linking = {
  prefixes: ['uxmwallet://'],
  config: {
    screens: {
      Auth: 'auth', // uxmwallet://auth -> AuthScreen 이동
    },
  },
};

function App() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="MainTabs">
        {/* 하단 탭 메인 스택 */}
        <Stack.Screen
          name="MainTabs"
          component={MainTabNavigator}
          options={{headerShown: false}}
        />

        {/* 딥링크 / 단독 스크린 */}
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
