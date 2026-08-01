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

// 환경변수 Uint8Array 디코딩 헬퍼 함수
function decodeBase64ToUint8Array(base64String: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64String, 'base64'));
}

// 1. 프로젝트 에셋의 최신 Genesis 파일을 앱 저장소로 복사 (캐시 삭제 포함)
async function copyGenesisFileToAppStorage(): Promise<string> {
  const fileName = 'genesis 3.txn';
  const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

  const assetPath =
    Platform.OS === 'ios'
      ? `${RNFS.MainBundlePath}/${fileName}`
      : `assets/${fileName}`;

  try {
    const fileExists = await RNFS.exists(destPath);
    if (fileExists) {
      await RNFS.unlink(destPath);
    }

    if (Platform.OS === 'ios') {
      await RNFS.copyFile(assetPath, destPath);
    } else {
      const content = await RNFS.readFileRes(fileName, 'utf8');
      await RNFS.writeFile(destPath, content, 'utf8');
    }
    console.log('✅ Genesis 파일 최신화 완료:', destPath);
  } catch (err) {
    console.error('❌ Genesis 파일 복사 실패:', err);
  }
  return destPath;
}

// 2. Indy Pool 생성
export async function setupIndyPool(): Promise<PoolCreate | null> {
  try {
    const genesisFilePath = await copyGenesisFileToAppStorage();
    const genesisData = await RNFS.readFile(genesisFilePath, 'utf8');

    console.log(
      '📌 [DEBUG] 읽어온 Genesis IP 상태:',
      genesisData.includes('146.56.111.218')
        ? '🟢 공인 IP 정상 적용'
        : '🔴 사설/구버전 IP 검출됨',
    );

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

// 3. Ed25519 & X25519 키 쌍 및 DID 생성
export async function generateSeparateKeyPairs() {
  const ed25519KeyPair = nacl.sign.keyPair();
  const x25519KeyPair = nacl.box.keyPair();

  const edPublicKeyBase58 = bs58.encode(ed25519KeyPair.publicKey);
  const edPrivateKeyBase58 = bs58.encode(ed25519KeyPair.secretKey);
  const x25519PublicKeyBase58 = bs58.encode(x25519KeyPair.publicKey);
  const x25519PrivateKeyBase58 = bs58.encode(x25519KeyPair.secretKey);

  const did = edPublicKeyBase58.slice(0, 22);

  return {
    did,
    edPublicKey: edPublicKeyBase58,
    edPrivateKey: edPrivateKeyBase58,
    x25519PublicKey: x25519PublicKeyBase58,
    x25519PrivateKey: x25519PrivateKeyBase58,
  };
}

// 4. Step 1: NYM 트랜잭션 전송
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

    const nymRequest = new NymRequest(nymTransaction);
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

    const response = await pool.submitRequest(nymRequest);
    console.log('✅ NYM DID 등록 성공:', response);
    return response;
  } catch (error) {
    console.error('❌ NYM DID 등록 실패:', error);
    return null;
  }
}

// 5. Step 2 & Step 3: ATTRIB 개별 전송 헬퍼
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
