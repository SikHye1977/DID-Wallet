import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';

// 1. 하위 탭 메뉴 타입
export type MainTabParamList = {
  Home: undefined;
  Ticket: undefined;
  Profile: undefined;
};

// 2. 전체 스택 내비게이터 타입 (화면 목록)
export type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  Test: undefined;
  Auth: {authRequestId?: string} | undefined; // 딥링크로 넘어오는 값
  CameraScreen: {mode: string; pendingDidKeys: any};
  MainTabs: {screen: keyof MainTabParamList};
};

// 3. AuthScreen 전용 타입 헬퍼
export type AuthScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Auth'
>;
export type AuthScreenRouteProp = RouteProp<RootStackParamList, 'Auth'>;
