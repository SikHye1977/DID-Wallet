import React, {useCallback, useEffect, useState} from 'react';

import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {useNavigation, useRoute} from '@react-navigation/native';

import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import {useWalletStore} from '../store/useWalletStore';

import {createVP} from '../utils/VCVP/createVP';

import {
  requestVerificationObject,
  submitPresentation,
} from '../utils/VCVP/verifierApi';

type VerifyRouteParams = {
  vc: any;
  requestUri: string;
};

type VerificationStatus =
  | 'PREPARING'
  | 'REQUEST_OBJECT'
  | 'SCHEMA_CHECK'
  | 'VP_GENERATION'
  | 'VP_SUBMISSION'
  | 'VP_VERIFIED'
  | 'FAILED';

function toFullDid(did: string): string {
  if (did.startsWith('did:')) {
    return did;
  }

  return `did:sov:${did}`;
}

export default function VerifyScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const {vc, requestUri} = (route.params ?? {}) as VerifyRouteParams;

  const selectedDid = useWalletStore(state => state.selectedDid);

  const [status, setStatus] = useState<VerificationStatus>('PREPARING');

  const [statusText, setStatusText] =
    useState('티켓 검증을 준비하고 있습니다.');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [hasStarted, setHasStarted] = useState(false);

  const startVerification = useCallback(async () => {
    if (hasStarted) {
      return;
    }

    setHasStarted(true);

    try {
      // =====================================================
      // 0. 기본 데이터 확인
      // =====================================================

      if (!vc) {
        throw new Error('검증할 VC가 전달되지 않았습니다.');
      }

      if (!requestUri) {
        throw new Error('Verifier request_uri가 없습니다.');
      }

      if (!selectedDid) {
        throw new Error('현재 선택된 DID가 없습니다.');
      }

      const subject =
        vc?.credentialSubject ?? vc?.credential?.credentialSubject;

      if (!subject) {
        throw new Error('VC에 credentialSubject가 없습니다.');
      }

      const ticketNumber = subject?.ticketNumber;

      if (!ticketNumber) {
        throw new Error('VC에 ticketNumber가 없습니다.');
      }

      if (!subject?.id) {
        throw new Error('VC에 credentialSubject.id가 없습니다.');
      }

      // =====================================================
      // 1. DID 형식 준비
      // =====================================================

      const holderDid = toFullDid(selectedDid.did);

      const primaryPurchaserDid = holderDid;

      console.log('====================================');

      console.log('🔍 [VP Verify] 검증 시작');

      console.log(' - Ticket Number:', ticketNumber);

      console.log(' - Holder DID:', holderDid);

      console.log('====================================');

      // =====================================================
      // 2. Request Object 요청
      // =====================================================

      setStatus('REQUEST_OBJECT');

      setStatusText('Verifier에 검증 요청 정보를 확인하고 있습니다.');

      const requestObject = await requestVerificationObject(requestUri, {
        ticketNumber,

        primaryPurchaserDid,

        holderDid,
      });

      console.log('✅ [Verifier] Request Object 응답 수신');

      console.log(' - presenterRole:', requestObject.presenterRole);

      console.log(' - schemaURL:', requestObject.schemaURL);

      // =====================================================
      // 3. VC Schema 검증
      // =====================================================

      setStatus('SCHEMA_CHECK');

      setStatusText('티켓 Credential Schema를 확인하고 있습니다.');

      const vcSchemaUrl = vc?.credentialSchema?.id;

      if (!vcSchemaUrl) {
        throw new Error('VC에 credentialSchema.id가 없습니다.');
      }

      if (vcSchemaUrl !== requestObject.schemaURL) {
        throw new Error(
          'Verifier가 요구하는 Credential Schema와 현재 티켓의 Schema가 일치하지 않습니다.',
        );
      }

      console.log('✅ [Verifier] Credential Schema 일치');

      // =====================================================
      // 4. VP 생성
      // =====================================================

      setStatus('VP_GENERATION');

      setStatusText('Verifiable Presentation을 생성하고 있습니다.');

      /**
       * VC 자체는 절대 수정하지 않는다.
       *
       * Issuer가 발급한 VC + proof를
       * 그대로 VP에 포함한다.
       */
      const vp = await createVP(vc, selectedDid);

      console.log('✅ [VP] 생성 완료');

      // =====================================================
      // 5. VP 제출
      // =====================================================

      setStatus('VP_SUBMISSION');

      setStatusText('Verifier에 VP를 제출하고 있습니다.');

      const presentationResult = await submitPresentation(
        requestObject.presentationSubmissionURL,
        vp,
      );

      console.log('📥 [Verifier] VP 제출 응답:', presentationResult);

      // =====================================================
      // 6. isValid 확인
      // =====================================================

      if (!presentationResult.isValid) {
        throw new Error(
          'Verifier가 해당 VP를 유효하지 않은 것으로 판정했습니다.',
        );
      }

      console.log('✅ [Verifier] VP 검증 성공');

      console.log(' - requestId:', presentationResult.requestId);

      console.log(' - challenge exists:', !!presentationResult.challenge);

      console.log(' - DIDAuthURL exists:', !!presentationResult.DIDAuthURL);

      setStatus('VP_VERIFIED');

      setStatusText('VP 검증에 성공했습니다. Holder 인증을 준비합니다.');
    } catch (error) {
      console.error('❌ [VP Verify] 검증 실패:', error);

      const message =
        error instanceof Error
          ? error.message
          : '티켓 검증 중 알 수 없는 오류가 발생했습니다.';

      setErrorMessage(message);

      setStatus('FAILED');

      setStatusText('티켓 검증에 실패했습니다.');
    }
  }, [vc, requestUri, selectedDid, hasStarted]);

  useEffect(() => {
    startVerification();
  }, [startVerification]);

  const isLoading = status !== 'VP_VERIFIED' && status !== 'FAILED';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>티켓 검증</Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isLoading && (
          <>
            <ActivityIndicator size="large" color="#2563eb" />

            <Text style={styles.statusTitle}>티켓 검증 중</Text>

            <Text style={styles.statusText}>{statusText}</Text>
          </>
        )}

        {status === 'VP_VERIFIED' && (
          <>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={42} color="#ffffff" />
            </View>

            <Text style={styles.statusTitle}>VP 검증 성공</Text>

            <Text style={styles.statusText}>{statusText}</Text>

            <Text style={styles.description}>
              Verifiable Presentation의 유효성 검증이 완료되었습니다. 다음
              단계에서 Holder DID 인증을 진행합니다.
            </Text>
          </>
        )}

        {status === 'FAILED' && (
          <>
            <View style={styles.errorIcon}>
              <Ionicons name="close" size={42} color="#ffffff" />
            </View>

            <Text style={styles.statusTitle}>검증 실패</Text>

            <Text style={styles.errorMessage}>{errorMessage}</Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                navigation.goBack();
              }}>
              <Text style={styles.retryButtonText}>QR 다시 스캔</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingHorizontal: 16,
    paddingVertical: 12,

    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',

    backgroundColor: '#ffffff',
  },

  backButton: {
    padding: 6,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  headerSpacer: {
    width: 34,
  },

  content: {
    flex: 1,

    justifyContent: 'center',
    alignItems: 'center',

    paddingHorizontal: 32,
  },

  statusTitle: {
    marginTop: 20,

    fontSize: 20,
    fontWeight: 'bold',

    color: '#0f172a',

    textAlign: 'center',
  },

  statusText: {
    marginTop: 10,

    fontSize: 14,

    color: '#64748b',

    lineHeight: 21,

    textAlign: 'center',
  },

  description: {
    marginTop: 14,

    fontSize: 13,

    color: '#94a3b8',

    lineHeight: 20,

    textAlign: 'center',
  },

  successIcon: {
    width: 76,
    height: 76,

    borderRadius: 38,

    backgroundColor: '#10b981',

    justifyContent: 'center',
    alignItems: 'center',
  },

  errorIcon: {
    width: 76,
    height: 76,

    borderRadius: 38,

    backgroundColor: '#ef4444',

    justifyContent: 'center',
    alignItems: 'center',
  },

  errorMessage: {
    marginTop: 12,

    fontSize: 14,

    color: '#ef4444',

    lineHeight: 21,

    textAlign: 'center',
  },

  retryButton: {
    marginTop: 24,

    paddingHorizontal: 24,
    paddingVertical: 12,

    borderRadius: 10,

    backgroundColor: '#2563eb',
  },

  retryButtonText: {
    color: '#ffffff',

    fontSize: 14,

    fontWeight: 'bold',
  },
});
