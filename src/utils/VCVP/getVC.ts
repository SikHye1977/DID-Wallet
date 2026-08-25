export async function getVC(url: string): Promise<any> {
  if (!url) {
    throw new Error('VC 발급 URL이 없습니다.');
  }

  const response = await fetch(url);

  const responseText = await response.text();

  let result: any;

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(
      `VC 발급 서버가 올바른 JSON을 반환하지 않았습니다. HTTP ${response.status}`,
    );
  }

  // HTTP 오류 또는 body 안에 포함된 오류 모두 검사
  if (
    !response.ok ||
    (typeof result?.status === 'number' && result.status >= 400)
  ) {
    throw new Error(
      result?.message ||
        result?.error ||
        `VC 발급 요청에 실패했습니다. HTTP ${response.status}`,
    );
  }
  
  const vc = result?.vc ?? result;

  if (!vc || typeof vc !== 'object') {
    throw new Error('서버 응답에 VC가 없습니다.');
  }

  const subject =
    vc?.credentialSubject ??
    vc?.credential?.credentialSubject;

  if (!subject?.id) {
    throw new Error('VC에 credentialSubject.id가 없습니다.');
  }

  if (!subject?.ticketNumber) {
    throw new Error('VC에 ticketNumber가 없습니다.');
  }

  return vc;
}