import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp, NavigatorScreenParams} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';

// 1. 하단 탭 내비게이터 파라미터 타입 (Home, Camera, Profile)
export type MainTabParamList = {
  Home: undefined; // 티켓 관리 화면 (HomeScreen)
  Camera: {mode?: string; pendingDidKeys?: any} | undefined; // 안면 인증 화면
  Profile: undefined; // DID 지갑 프로필 화면
};

// 2. 최상위 루트 스택 내비게이터 파라미터 타입
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>; // 하단 탭 스택
  Auth: {authRequestId?: string} | undefined; // DID-Auth 딥링크 진입 화면
  Test: undefined; // 테스트 전용 화면
};

// 3. 화면별 Navigation Prop 타입 헬퍼
export type RootStackNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

// AuthScreen 전용 Props
export type AuthScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Auth'
>;
export type AuthScreenRouteProp = RouteProp<RootStackParamList, 'Auth'>;

// 탭 스크린별 Props
export type HomeScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'Home'
>;
export type CameraScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'Camera'
>;
export type ProfileScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'Profile'
>;
