export interface RequestObjectBody {
  ticketNumber: string;
  primaryPurchaserDid: string;
  holderDid: string;
}

export interface RequestObjectResponse {
  presenterRole: string;
  schemaURL: string;
  presentationSubmissionURL: string;
}

export interface PresentationResponse {
  requestId: string;
  isValid: boolean;
  challenge?: string;
  DIDAuthURL?: string;
}

export interface HolderAuthRequest {
  decrypted_challenge: string;
  holder_did: string;
}

export interface HolderAuthResponse {
  requestId: string;
  result: boolean;
}

async function parseJsonResponse(response: Response): Promise<any> {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(
      `Verifier가 올바른 JSON을 반환하지 않았습니다. HTTP ${response.status}`,
    );
  }
}

/**
 * STEP 1
 *
 * QR에서 받은 request_uri에
 * ticketNumber / primaryPurchaserDid / holderDid 전송
 */
export async function requestVerificationObject(
  requestUri: string,
  body: RequestObjectBody,
): Promise<RequestObjectResponse> {
  const response = await fetch(requestUri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const result = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      result?.message ??
        result?.error ??
        `Verifier Request Object 요청 실패: HTTP ${response.status}`,
    );
  }

  if (!result?.schemaURL) {
    throw new Error('Verifier 응답에 schemaURL이 없습니다.');
  }

  if (!result?.presentationSubmissionURL) {
    throw new Error('Verifier 응답에 presentationSubmissionURL이 없습니다.');
  }

  return result;
}

/**
 * STEP 2
 *
 * 생성한 VP를 Verifier에 제출
 */
export async function submitPresentation(
  presentationSubmissionURL: string,
  vp: any,
): Promise<PresentationResponse> {
  const response = await fetch(presentationSubmissionURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vp_format: 'ldp_vp',
      vp,
    }),
  });

  console.log('========== [VP Submission Request] ==========');
  console.log('URL:', presentationSubmissionURL);
  console.log('VP type:', vp?.type);
  console.log('VP holder:', vp?.holder);
  console.log(
    'VC count:',
    Array.isArray(vp?.verifiableCredential)
      ? vp.verifiableCredential.length
      : 0,
  );
  console.log('VP proof type:', vp?.proof?.type);
  console.log('=============================================');

  const result = await parseJsonResponse(response);
  console.log('========== [VP Submission Response] ==========');
  console.log('HTTP Status:', response.status);
  console.log('Response OK:', response.ok);
  console.log('Response Body:', result);
  console.log('==============================================');
  if (!response.ok) {
    throw new Error(
      result?.message ??
        result?.error ??
        `VP 제출 실패: HTTP ${response.status}`,
    );
  }

  if (typeof result?.isValid !== 'boolean') {
    throw new Error('Verifier 응답에 isValid 값이 없습니다.');
  }

  return result;
}

/**
 * STEP 3
 *
 * VP 검증 성공 후 Challenge 복호화 결과를
 * Verifier가 전달한 DIDAuthURL로 전송
 */
export async function submitHolderAuth(
  didAuthURL: string,
  body: HolderAuthRequest,
): Promise<HolderAuthResponse> {
  const response = await fetch(didAuthURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const result = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      result?.message ??
        result?.error ??
        `Holder DID-Auth 요청 실패: HTTP ${response.status}`,
    );
  }

  if (typeof result?.result !== 'boolean') {
    throw new Error('Verifier Holder DID-Auth 응답에 result 값이 없습니다.');
  }

  return {
    requestId: result.requestId,
    result: result.result,
  };
}
