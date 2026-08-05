import nacl from 'tweetnacl';
import bs58 from 'bs58';
import {
  PoolCreate,
  NymRequest,
  AttribRequest,
} from '@hyperledger/indy-vdr-react-native';
import 'fast-text-encoding';
import RNFS from 'react-native-fs';
import {Buffer} from 'buffer';
import {DID_PRIVATEKEY_FOR_REGISTER} from '@env';
import 'react-native-get-random-values';
import {Platform} from 'react-native';

// Ed25519, X25519 키 쌍 생성 및 DID 생성
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

// 환경변수 Uint8Array 디코딩 헬퍼 함수
function decodeBase64ToUint8Array(base64String: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64String, 'base64'));
}

// NYM 트랜잭션 제출 함수 (외부에서 생성한 pool 인스턴스를 받아서 처리)
export async function registerDID(
  pool: PoolCreate,
  subDid: string,
  targetDid: string,
  publicKey: string,
) {
  try {
    const submitterDid = subDid;
    const dest = targetDid.replace(/^did:indy:/, '');
    const verkey = publicKey;

    const nymTransaction = {
      submitterDid,
      dest,
      verkey,
      version: 2,
    };

    console.log(
      '✅ NYM 트랜잭션 JSON:',
      JSON.stringify(nymTransaction, null, 2),
    );

    const nymRequest = new NymRequest(nymTransaction);
    console.log('✅ NYM Request 생성 완료:', nymRequest);

    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(nymRequest.signatureInput);

    const decoded_key = decodeBase64ToUint8Array(DID_PRIVATEKEY_FOR_REGISTER);
    const privateKey64 = new Uint8Array(decoded_key);
    const signature = nacl.sign.detached(messageBytes, privateKey64);
    nymRequest.setSignature({signature});

    if (!pool) {
      console.error('❌ Pool이 전달되지 않았습니다.');
      return null;
    }

    // 🚀 전달받은 Pool로 제출 (pool.close() 호출 안 함)
    const response = await pool.submitRequest(nymRequest);
    console.log('✅ NYM DID 등록 완료:', response);
    return response;
  } catch (error) {
    console.error('❌ NYM DID 등록 실패:', error);
    return null;
  }
}

// 단일 ATTRIB 속성(최상위 키 1개)을 원장에 올리는 공통 헬퍼 함수
export async function sendSingleAttrib(
  pool: PoolCreate,
  submitterDid: string,
  targetDid: string,
  rawObject: Record<string, any>,
  privateKey: string,
) {
  try {
    const attribTransaction = {
      submitterDid,
      targetDid,
      raw: JSON.stringify(rawObject),
    };

    const attribRequest = new AttribRequest(attribTransaction);
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(attribRequest.signatureInput);

    const privateKeyUint8Array = bs58.decode(privateKey);
    const signature = nacl.sign.detached(messageBytes, privateKeyUint8Array);
    attribRequest.setSignature({signature});

    const response = await pool.submitRequest(attribRequest);
    return response;
  } catch (error) {
    console.error('❌ ATTRIB 단일 전송 실패:', error);
    return null;
  }
}

// X25519 키와 RSA 공개키를 순차적으로 ATTRIB 트랜잭션 등록하는 통합 함수
export async function addPublicKeysToAttrib(
  pool: PoolCreate,
  submitterDid: string,
  targetDid: string,
  x25519PublicKey: string,
  rsaPublicKey: string | undefined,
  privateKey: string,
) {
  try {
    // 1) X25519 공개키 ATTRIB 전송
    console.log('🔄 [1/2] X25519 공개키 ATTRIB 등록 중...');
    const resX25519 = await sendSingleAttrib(
      pool,
      submitterDid,
      targetDid,
      {'x25519-public-key': x25519PublicKey},
      privateKey,
    );

    if (!resX25519) {
      console.error('❌ X25519 공개키 ATTRIB 등록 실패');
      return null;
    }

    // 2) RSA 공개키 ATTRIB 전송 (존재할 경우)
    if (rsaPublicKey) {
      console.log('🔄 [2/2] RSA 공개키 ATTRIB 등록 중...');
      const resRSA = await sendSingleAttrib(
        pool,
        submitterDid,
        targetDid,
        {'rsa-public-key': rsaPublicKey},
        privateKey,
      );

      if (!resRSA) {
        console.error('❌ RSA 공개키 ATTRIB 등록 실패');
        return null;
      }
    }

    console.log('✅ 모든 공개키(X25519 + RSA) ATTRIB 등록 완료!');
    return true;
  } catch (error) {
    console.error('❌ ATTRIB 등록 전체 과정 실패:', error);
    return null;
  }
}

// 프로젝트 에셋에서 제네시스 파일을 복사해 앱 저장소 경로 반환
async function copyGenesisFileToAppStorage(): Promise<string> {
  const fileName = 'genesis 3.txn';
  const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

  const fileExists = await RNFS.exists(destPath);
  if (!fileExists) {
    const assetPath =
      Platform.OS === 'ios'
        ? `${RNFS.MainBundlePath}/${fileName}`
        : `assets/${fileName}`;

    try {
      if (Platform.OS === 'ios') {
        await RNFS.copyFile(assetPath, destPath);
      } else {
        const content = await RNFS.readFileRes(fileName, 'utf8');
        await RNFS.writeFile(destPath, content, 'utf8');
      }
      console.log('Genesis 파일 복사 완료:', destPath);
    } catch (err) {
      console.error('Genesis 파일 복사 실패:', err);
    }
  }
  return destPath;
}

// Indy Pool 인스턴스 생성 함수
export async function setupIndyPool(): Promise<PoolCreate | null> {
  try {
    const genesisFilePath = await copyGenesisFileToAppStorage();
    const genesisData = await RNFS.readFile(genesisFilePath, 'utf8');

    const pool = new PoolCreate({
      parameters: {
        transactions: genesisData,
      },
    });
    return pool;
  } catch (error) {
    console.error('❌ Indy Pool 생성 실패:', error);
    return null;
  }
}
