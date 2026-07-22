module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // 1. 환경변수 설정
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        blacklist: null,
        whitelist: null,
        safe: false,
        allowUndefined: true,
      },
    ],
    // 2. Worklets 및 Reanimated 설정
    'react-native-worklets-core/plugin',
    'react-native-reanimated/plugin',
  ],
};
