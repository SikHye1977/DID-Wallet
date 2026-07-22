import nacl, {verify} from 'tweetnacl';
import bs58 from 'bs58';
import {
  PoolCreate,
  NymRequest,
  NymRequestOptions,
  GetNymRequest,
} from '@hyperledger/indy-vdr-react-native';
import 'fast-text-encoding';
import RNFS from 'react-native-fs';
import {Buffer} from 'buffer';
import {DID_PRIVATEKEY_FOR_REGISTER} from '@env';
import 'react-native-get-random-values';
import {AttribRequest} from '@hyperledger/indy-vdr-react-native';
import {Platform} from 'react-native';

// 25.03.18 추가
// Ed25519, x25519 키 쌍 생성 및 DID 생성
export async function generateSeparateKeyPairs() {
  // ✅ Ed25519 키 쌍 생성 (DID 및 서명용)
  const ed25519KeyPair = nacl.sign.keyPair();

  // ✅ X25519 키 쌍 생성 (키 교환용)
  const x25519KeyPair = nacl.box.keyPair();

  // ✅ Base58 인코딩
  const edPublicKeyBase58 = bs58.encode(ed25519KeyPair.publicKey);
  const edPrivateKeyBase58 = bs58.encode(ed25519KeyPair.secretKey);
  const x25519PublicKeyBase58 = bs58.encode(x25519KeyPair.publicKey);
  const x25519PrivateKeyBase58 = bs58.encode(x25519KeyPair.secretKey);

  // ✅ DID 생성 (Indy 규격을 충족하도록 22~23자 유지)
  const did = edPublicKeyBase58.slice(0, 22);

  console.log('✅ 생성된 DID:', did);
  console.log('✅ Ed25519 Public Key:', edPublicKeyBase58);
  console.log('✅ Ed25519 Private Key:', edPrivateKeyBase58);
  console.log('✅ X25519 Public Key:', x25519PublicKeyBase58);
  console.log('✅ X25519 Private Key:', x25519PrivateKeyBase58);

  return {
    did,
    edPublicKey: edPublicKeyBase58,
    edPrivateKey: edPrivateKeyBase58,
    x25519PublicKey: x25519PublicKeyBase58,
    x25519PrivateKey: x25519PrivateKeyBase58,
  };
}

// 환경변수 unit8array로 디코딩 하기 위한 함수
function decodeBase64ToUint8Array(base64String: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64String, 'base64'));
}

export async function registerDID(
  subDid: string,
  targetDid: string,
  publicKey: string,
) {
  console.log(DID_PRIVATEKEY_FOR_REGISTER);
  const pool = await setupIndyPool();
  try {
    // ✅ DID에서 "did:indy:" 접두사를 제거해야 함
    const submitterDid = subDid;
    const dest = targetDid.replace(/^did:indy:/, '');
    const verkey = publicKey;
    const alias = 'Holder_test_did_indy_vdr';
    const role: 'ENDORSER' = 'ENDORSER'; // ✅ 역할을 정확한 타입으로 설정

    // ✅ Indy 원장이 요구하는 JSON 형식으로 NYM 트랜잭션 생성
    const nymTransaction = {
      submitterDid, // ✅ 트랜잭션을 제출하는 기존 DID (TRUST_ANCHOR 권한 필요)
      dest, // ✅ 새로 등록할 DID
      verkey, // ✅ 해당 DID의 Public Key (Base58)
      // alias,  // ✅ (선택 사항) DID의 별칭
      // role,  // ✅ 역할을 "ENDORSER"로 설정
      version: 2, // ✅ 필수 프로토콜 버전 추가
    };

    console.log(
      '✅ NYM 트랜잭션 JSON:',
      JSON.stringify(nymTransaction, null, 2),
    );

    // ✅ NymRequest 객체 생성
    const nymRequest = new NymRequest(nymTransaction);

    console.log('✅ NYM Request 생성 완료:', nymRequest);

    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(nymRequest.signatureInput);

    // const decoded_key = decodeBase64ToUint8Array(DID_PRIVATEKEY_FOR_REGISTER);
    const decoded_key = decodeBase64ToUint8Array(DID_PRIVATEKEY_FOR_REGISTER);
    const privateKey64 = new Uint8Array(decoded_key);
    const signature = nacl.sign.detached(messageBytes, privateKey64);
    nymRequest.setSignature({signature});
    if (!pool) {
      console.log('there are no Pool');
    } else {
      // ✅ Indy Ledger에 트랜잭션 제출
      const response = await pool.submitRequest(nymRequest);
      console.log('✅ DID 등록 완료:', response);
      pool.close();
      return response;
    }
  } catch (error) {
    console.error('❌ DID 등록 실패:', error);
    return null;
  }
}

// 25.03.18 추가
// X25519 키를 ATTRIB 트랜잭션을 통해 DID Document에 추가
export async function addX25519PublicKey(
  submitterDid: string,
  targetDid: string,
  x25519PublicKey: string,
  privateKey: string,
) {
  const pool = await setupIndyPool();

  try {
    // ✅ X25519 공개 키만 포함하는 JSON 데이터 생성
    const rawData = {
      'x25519-public-key': x25519PublicKey,
    };

    // ✅ ATTRIB 트랜잭션 생성 (X25519 키만 저장)
    const attribTransaction = {
      submitterDid, // ✅ X25519 키를 등록할 DID 소유자
      targetDid, // ✅ 대상 DID
      raw: JSON.stringify(rawData), // ✅ X25519 키만 포함
    };

    console.log(
      '✅ X25519 공개 키 ATTRIB 트랜잭션 JSON:',
      JSON.stringify(attribTransaction, null, 2),
    );

    // ✅ AttribRequest 객체 생성
    const attribRequest = new AttribRequest(attribTransaction);
    console.log('✅ ATTRIB Request 생성 완료:', attribRequest);

    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(attribRequest.signatureInput);

    // ✅ Base58로 인코딩된 Private Key를 디코딩하여 Uint8Array로 변환
    const privateKeyUint8Array = bs58.decode(privateKey);

    // ✅ DID 소유자의 Private Key로 서명 (Endorser가 아니라!)
    const signature = nacl.sign.detached(messageBytes, privateKeyUint8Array);
    attribRequest.setSignature({signature});

    if (!pool) {
      console.log('❌ Pool이 생성되지 않음');
      return;
    }

    // ✅ Indy Ledger에 트랜잭션 제출
    const response = await pool.submitRequest(attribRequest);
    console.log('✅ X25519 공개 키 등록 완료:', response);
    pool.close();
    return response;
  } catch (error) {
    console.error('❌ X25519 공개 키 등록 실패:', error);
    return null;
  }
}

// 25.04.09추가
// 프로젝트 에셋에 제네시스 파일 추가 및 읽어오기
async function copyGenesisFileToAppStorage(): Promise<string> {
  const fileName = 'genesis 3.txn';
  const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

  const fileExists = await RNFS.exists(destPath);
  if (!fileExists) {
    const assetPath =
      Platform.OS === 'ios'
        ? `${RNFS.MainBundlePath}/${fileName}`
        : `assets/${fileName}`; // Android는 assets에 바로 접근 불가

    try {
      if (Platform.OS === 'ios') {
        await RNFS.copyFile(assetPath, destPath);
      } else {
        // Android는 assets에서 파일 읽기 위해 raw 리소스로 등록 필요 (추가 설명 아래)
        const content = await RNFS.readFileRes(fileName, 'utf8'); // Android는 리소스 ID 필요할 수 있음
        await RNFS.writeFile(destPath, content, 'utf8');
      }
      console.log('Genesis 파일 복사 완료:', destPath);
    } catch (err) {
      console.error('Genesis 파일 복사 실패:', err);
    }
  }
  return destPath;
}

// create pool for register did
export async function setupIndyPool(): Promise<PoolCreate | null> {
  const genesisFilePath = await copyGenesisFileToAppStorage();
  const genesisData = await RNFS.readFile(genesisFilePath, 'utf8');

  const pool = new PoolCreate({
    parameters: {
      transactions: genesisData,
    },
  });
  return pool;
}
