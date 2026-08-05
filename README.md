# DID-Wallet

## 1. 프로젝트 개요 및 목적 (Project Overview)

UXM Wallet은 안면 생체 특징점 기반의 Fuzzy Extractor 알고리즘과 C++ 네이티브 암호화 기술을 결합하여, 개인키의 디바이스 저장 없이 안면 스캔을 통해 런타임에 결정론적으로 RSA 개인키를 복구하고 Hyperledger Indy 블록체인 기반의 분산 신원증명(DID) 및 VC 티켓을 관리하는 모바일 지갑 애플리케이션입니다.

### 🎯 핵심 목적

- **키 저장소 부재(Keyless) 보안 모델 구축**: 개인키를 Local Storage나 서버에 저장하지 않고, 안면 특징점 시드($R$)를 통해 매번 동일한 RSA 2048비트 키 쌍을 재생성.
- **C++ 네이티브 모듈 연동**: JS 스레드 블로킹 방지 및 고성능 암호화 연산 처리(~241ms).
- **분산 신원증명(DID) 기반 티켓팅**: Hyperledger Indy 원장 연동을 통한 DID 등록 및 모바일 티켓 VC 관리.
- **티켓 패스(Ticket Pass) UX/UI**: iOS/Apple Wallet 스타일의 모던 디지털 티켓 지갑 UI 제공.

## 2. 개발 환경 및 주요 패키지 (Environment & Dependencies)

- **Framework**: React Native (iOS Target / iOS 26.1 Simulator, iPhone 16)
- **Language**: TypeScript, C++17, Objective-C++
- **Blockchain Infrastructure**: Hyperledger Indy Network (`genesis 3.txn` / Plenum PBFT Quorum)

### 실행 명령어

```
프로젝트 실행 : npx react-native run-ios --simulator="{특정 시뮬레이터}"
의존성 설치 : Bundle exec pod install                             // 프로젝트 내의 pod을 사용하기 위함
```

### 📦 주요 패키지 목록

| **패키지명**                                | **목적**                                     |
| ------------------------------------------- | -------------------------------------------- |
| `@react-navigation/native`                  | 스택 및 하단 탭 내비게이션 관리              |
| `@react-navigation/native-stack`            | Native Stack 라우터                          |
| `@react-navigation/bottom-tabs`             | Bottom Tab 내비게이션                        |
| `@react-native-async-storage/async-storage` | 로컬 스토리지 (선택된 DID, 계정 데이터 저장) |
| `react-native-safe-area-context`            | iOS Safe Area 뷰 처리                        |
| `react-native-vector-icons`                 | Ionicons 기반 UI 아이콘 제공                 |
| `react-native-qrcode-svg`                   | QR 코드 생성 및 표시                         |
| `buffer`                                    | FCM/바이너리 데이터 인코딩                   |

## 3. C++ 네이티브 암호화 모듈 (C++ Native Modules)

JS 단의 암호화 성능 한계와 키 무작위성을 통제하기 위해 C++ 네이티브 암호화 및 오차정정 모듈을 구축하고 Objective-C++ 브릿지로 연결했습니다.

```
ios/CPP/
├── RSA/
│   ├── DeterministicRSA.hpp
│   ├── DeterministicRSA.cpp          # OpenSSL 기반 DRBG 난수 제어 & RSA 2048 키 생성
│   ├── DeterministicRSAModule.h
│   └── DeterministicRSAModule.mm     # React Native C++ Native Bridge
├── BCH/
│   ├── BCH.cpp                       # Fuzzy Extractor용 BCH 오차정정 코드 연산
│   └── BCH.hpp
│   └── BCHModule.h
│   └── BCHModule.mm
└── Wallet-Bridging-Header.h
```

### 🛠️ 모듈별 상세 역할

- **DeterministicRSA 모듈**: 안면 생체 시드(Fuzzy Extractor 복구 키 `seedHex`)를 입력받아 100% 동일한 RSA 2048비트 키 쌍 및 Fingerprint 생성.
  - 산사태 효과(Avalanche Effect) 검증 완료 (1비트 변경 시 전혀 다른 키 유도).
- **BCH 모듈**: 생체 노이즈가 포함된 안면 데이터 스캔 시 오차를 보정하여 원본 시드 $R$을 정확히 복구하는 BCH 에러 정정 연산 수행.

## 4. 주요 스크린 및 컴포넌트 (Screens & UI)

```
src/
├── component/
│   ├── profile/                  # 프로필 관리 컴포넌트
│   │   ├── ActionButtons.tsx
│   │   ├── DidDetail.tsx
│   │   ├── DidList.tsx
│   │   └── RenameModal.tsx
│   └── Ticket/                   # 티켓 UI 컴포넌트
│       └── VCcard.tsx            # 모던 티켓 패스 스타일 VC 카드 컴포넌트
├── screen/
│   ├── HomeScreen.tsx            # 메인 지갑 (티켓 VC 관리)
│   ├── TicketDetailScreen.tsx    # 티켓 상세 정보 & VC 데이터 조회
│   ├── ProfileScreen.tsx         # DID 계정 선택 & Indy 원장 DID 등록
│   ├── AuthScreen.tsx            # DID-Auth 로그인 테스트
│   ├── TestRegisterScreen.tsx    # C++ Deterministic RSA 모듈 검증 테스트
│   └── CameraScreen.tsx          # 안면 스캔 / QR 스캔
└── types/
    ├── did.ts                    # DID 및 VC 구조체 타입 정의
    └── navigation.ts             # 통합 Navigation ParamList 타입 정의
```

### 📱 스크린별 상세 기능

- **HomeScreen (메인 지갑 스크린)**:
  - DID별 필터링: 프로필에서 선택한 `SELECTED_DID` 소유의 VC 티켓만 동적 바인딩.
  - 티켓 패스 UI: 이벤트명, 소유자명, 티켓 번호, 절취선 노치(Notch) 그래픽 적용.
  - 편집/삭제 모드: 티켓 개별 삭제 기능 및 상태 토글.
- **TicketDetailScreen (티켓 상세 스크린)**:
  - 티켓 카드 요약: 발급자 및 소유 자격 정보 표시.
  - JSON 원문 아코디언: Verifiable Credential 원본 JSON 데이터 접기/펼치기.
- **TestRegisterScreen (C++ RSA 검증 테스트 스크린)**:
  - 동일 SEED 재현성(241ms), 카메라 Fingerprint 일치성, 1비트 민감도 산사태 효과 3단계 실시간 검증 수행.
- **ProfileScreen**:
  - 사용자 DID 목록 관리 및 `DIDGenerator.ts`를 이용해 Indy 원장(`146.56.111.218`)에 신규 DID 등록 트랜잭션 전송.
- **AuthScreen & CameraScreen**:
  - DID-Auth 상호 인증 및 안면/QR 스캔 인터페이스 제공.

## 5. 주요 로직 (Utils & Logic)

```
src/utils/
├── Fuzzy Extractor/
│   └── FE_Generator.ts   # 안면 특징점 기반 Fuzzy Extractor 연산 (R 및 P 유도)
├── AsyncStorage.ts      # AsyncStorage 래퍼 (SELECTED_DID, vc:* 키 관리)
├── DeterministicRSA.ts  # C++ Native RSA 브릿지 호출 모듈
├── DIDAuth.ts           # DID-Auth 서명 및 인증 로직
└── DIDGenerator.ts      # Hyperledger Indy DID 생성 및 원장 등록
```

### 💡 주요 처리 흐름

- **FE_Generator.ts**: 안면 스캔 데이터에서 생체 시드($R$) 및 오차 보정용 헬퍼 데이터($P$)를 생성/복구하는 유틸리티.
- **DeterministicRSA.ts**: C++ 네이티브 모듈을 호출하여 안면 시드 기반 런타임 결정론적 RSA 키 복구 수행.
- **DIDGenerator.ts & DIDAuth.ts**: Indy 네트워크와 통신하여 NYM 트랜잭션을 전송하고, 복구된 키를 이용해 DID 서명 및 인증 처리.
- **VC 저장 키 규칙**: `vc:${ticketNumber}_${ownerDid}` 형태로 중복 덮어쓰기 방지 및 DID 단위 분리.
- **Navigation 타입 교집합 처리**: `RootStackParamList & MainTabParamList` 교집합 타입 정의를 통해 상위 스택과 바텀 탭 간의 라우터 오버로드 타입 오류 해결.

## 6. 검증 및 시스템 성과 (Verification & Achievements)

- **C++ Native RSA 결정론 검증**:
  - 동일 SEED 재현성: 100% 동일한 공개키 및 Fingerprint 복구 성공 (소요시간 241ms).
  - 시드 민감도: 시드 1비트 변경 시 완벽히 분리된 키 생성 확인.
- **Hyperledger Indy 원장 연동**:
  - Plenum PBFT 합의 노드(포트 9701~9708) 상태 검증 및 정족수(Quorum) 충족을 통한 타임아웃(`Code 32`) 해결 가이드 구축.
