import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp, NavigatorScreenParams} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';

// 1. 하단 탭 내비게이터 파라미터 타입
export type MainTabParamList = {
  Home: undefined;
  Camera: {mode?: string; pendingDidKeys?: any} | undefined;
  Profile: undefined;
};

// 2. 최상위 루트 스택 내비게이터 파라미터 타입
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Auth: {authRequestId?: string} | undefined;
  Test: undefined;
  TicketDetail: {vc: any};
};

// 3. HomeScreen 전용 통합 Navigation Prop 타입 (타입 오류 방지용 교집합)
export type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList & MainTabParamList
>;

export type CameraScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'Camera'
>;
export type ProfileScreenNavigationProp = BottomTabNavigationProp<
  MainTabParamList,
  'Profile'
>;
