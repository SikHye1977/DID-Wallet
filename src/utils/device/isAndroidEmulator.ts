import {Platform} from 'react-native';

export function isAndroidEmulator(): boolean {
  if (Platform.OS !== 'android') {
    return false;
  }

  const constants = Platform.constants as any;

  const model = String(constants.Model ?? '').toLowerCase();
  const fingerprint = String(constants.Fingerprint ?? '').toLowerCase();
  const brand = String(constants.Brand ?? '').toLowerCase();

  return (
    model.includes('sdk_gphone') ||
    model.includes('emulator') ||
    model.includes('android sdk built for') ||
    fingerprint.includes('generic') ||
    fingerprint.includes('emulator') ||
    brand === 'generic'
  );
}