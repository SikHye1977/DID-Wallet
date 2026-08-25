// src/utils/createVP.ts

import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import {Buffer} from 'buffer';

import canonicalize from 'canonicalize';

export interface DidDataForVP {
  did: string;
  edVerkey: string;
  edSecretkey: string;
}

export interface VerifiablePresentation {
  '@context': string[];
  type: string[];
  verifiableCredential: any[];
  holder: string;

  proof?: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    jws: string;
  };
}

function base64UrlEncode(
  input: string | Uint8Array,
): string {
  const buffer =
    typeof input === 'string'
      ? Buffer.from(input, 'utf8')
      : Buffer.from(input);

  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/**
 * VC로부터 Verifiable Presentation을 생성하고
 * Holder의 Ed25519 Private Key로 서명한다.
 */
export async function createVP(
  vc: any,
  didData: DidDataForVP,
): Promise<VerifiablePresentation> {
  if (!vc) {
    throw new Error('VP에 포함할 VC가 없습니다.');
  }

  if (!didData?.did) {
    throw new Error('VP 생성에 사용할 DID가 없습니다.');
  }

  if (!didData?.edSecretkey) {
    throw new Error(
      'VP 서명에 사용할 Ed25519 비밀키가 없습니다.',
    );
  }

  const holderDid = didData.did.startsWith('did:')
    ? didData.did
    : `did:sov:${didData.did}`;

  // ---------------------------------------------------------
  // 1. VP 생성
  // ---------------------------------------------------------

  const vp: VerifiablePresentation = {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://example.org/context/v1/ticket-schema.json',
    ],

    type: ['VerifiablePresentation'],

    verifiableCredential: [vc],

    holder: holderDid,
  };

  // ---------------------------------------------------------
  // 2. Proof가 없는 VP를 canonicalize
  // ---------------------------------------------------------

  const vpToSign = {
    ...vp,
  };

  delete vpToSign.proof;

  const canonicalizedPayload =
    canonicalize(vpToSign);

  if (!canonicalizedPayload) {
    throw new Error(
      'VP Canonicalization에 실패했습니다.',
    );
  }

  // ---------------------------------------------------------
  // 3. Ed25519 Private Key
  // ---------------------------------------------------------

  const privateKey =
    bs58.decode(didData.edSecretkey);

  if (privateKey.length !== nacl.sign.secretKeyLength) {
    throw new Error(
      `Ed25519 비밀키 길이가 올바르지 않습니다. (${privateKey.length})`,
    );
  }

  // ---------------------------------------------------------
  // 4. Detached JWS Header
  // ---------------------------------------------------------

  const header = {
    alg: 'EdDSA',
    b64: false,
    crit: ['b64'],
  };

  const encodedHeader =
    base64UrlEncode(
      JSON.stringify(header),
    );

  const encodedPayload =
    base64UrlEncode(
      canonicalizedPayload,
    );

  const signingInput =
    new TextEncoder().encode(
      `${encodedHeader}.${encodedPayload}`,
    );

  // ---------------------------------------------------------
  // 5. Ed25519 Detached Signature
  // ---------------------------------------------------------

  const signature =
    nacl.sign.detached(
      signingInput,
      privateKey,
    );

  const encodedSignature =
    base64UrlEncode(signature);

  // ---------------------------------------------------------
  // 6. Proof 생성
  // ---------------------------------------------------------

  vp.proof = {
    type: 'Ed25519Signature2020',

    created: new Date().toISOString(),

    verificationMethod:
      `${holderDid}#key-1`,

    proofPurpose: 'authentication',

    jws:
      `${encodedHeader}..${encodedSignature}`,
  };

  console.log('✅ VP 생성 완료', {
    holder: vp.holder,
    vcCount:
      vp.verifiableCredential.length,
    proofType: vp.proof.type,
  });

  return vp;
}