// src/utils/VCVP/verifierApi.ts

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
 * QR에서 얻은 request_uri에
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
 * 생성된 VP를 Verifier에 제출
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

  const result = await parseJsonResponse(response);

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
