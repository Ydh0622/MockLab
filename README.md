# 🧪 MockLab

> **Browser-based API Mocking & Network Inspection Tool**  
> 백엔드 서버 없이 프론트엔드 환경에서 실시간으로 API를 모킹하고, 네트워크 트래픽을 가로채 검사할 수 있는 프로덕션급 개발자 도구입니다.

---

## 🚀 Key Features (주요 기능)

### 1. MSW v2 기반 실시간 네트워크 인터셉션
* `MSW(Mock Service Worker)`를 활용하여 브라우저 레벨에서 실제 네트워크 요청을 가로채고, 사용자가 정의한 응답 규칙에 따라 동적으로 가짜 응답을 반환합니다.

### 2. 동적 템플릿 엔진 & Mini-Faker
* **Path / Query / Request Body 바인딩:** 요청 URL의 경로 변수(`{{params.id}}`), 쿼리 스트링(`{{query.role}}`), 그리고 요청 본문(`{{body.username}}`)의 데이터를 응답 본문에 실시간으로 주입합니다.
* **내장 Mini-Faker 매크로:** 별도의 무거운 라이브러리 없이 `{{$uuid}}`, `{{$timestamp}}`, `{{$randomInt}}`, `{{$randomBoolean}}` 등의 예약어를 호출 시점마다 동적으로 생성합니다.

### 3. 실무 예외 시뮬레이션 (Edge Cases)
* **Auth Token Guard:** 요청 헤더에 유효한 `Authorization Bearer` 토큰이 없는 경우 즉시 `401 Unauthorized` 에러를 반환합니다.
* **Chaos Engineering Mode:** 0~100% 슬라이더로 장애 발생 확률을 지정하여, 무작위로 `500 Internal Server Error`를 발생시키고 프론트엔드의 에러 핸들링 및 재시도 로직을 테스트할 수 있습니다.
* **Custom Response Headers:** `X-Total-Count`, `Cache-Control` 등 원하는 HTTP 응답 헤더를 자유롭게 추가할 수 있습니다.

### 4. Stateful CRUD 가상 데이터베이스
* 인메모리 컬렉션 기반의 가상 DB를 연동하여, 단순 정적 JSON 반환을 넘어 `GET`(조회), `POST`(생성), `PUT`(수정), `DELETE`(삭제) 요청에 따라 실제 데이터가 영속적으로 변경되도록 시뮬레이션합니다.

### 5. 멀티 포맷 코드 스니펫 & URL 공유
* **원클릭 코드 생성:** 현재 설정된 엔드포인트를 즉시 호출할 수 있는 `Fetch API`, `Axios`, `cURL`, `TanStack Query (React Query)` 코드를 자동 생성합니다.
* **URL 압축 공유:** 전체 Mock 구성을 Base64로 인코딩하여 서버 없이 링크 하나로 팀원에게 환경을 공유할 수 있습니다.

---

## 🛠️ Tech Stack (기술 스택)

* **Core:** React 19, TypeScript, Vite
* **State Management:** Zustand (with `persist` middleware)
* **Mocking Engine:** MSW (Mock Service Worker) v2
* **Editor:** `@monaco-editor/react` (VS Code 내장 에디터 코어)
* **Styling:** Tailwind CSS, Lucide Icons

---

## 📁 Architecture (프로젝트 구조)

```text
src/
├── types/
│   └── mock.ts                 # 공통 데이터 인터페이스 및 타입 정의
├── utils/
│   ├── codeGenerator.ts        # Fetch, Axios, cURL, TanStack Query 스니펫 생성기
│   └── openapiParser.ts        # Swagger/OpenAPI JSON 파싱 유틸리티
├── mocks/
│   ├── interpolator.ts         # 동적 템플릿 변수 및 매크로 치환 엔진
│   ├── statefulCrud.ts         # 인메모리 가상 DB CRUD 실행기
│   └── browser.ts              # MSW Worker 초기화 및 동적 핸들러 바인딩
├── store/
│   └── useMockStore.ts         # Zustand 전역 상태 관리
├── components/
│   ├── Sidebar.tsx             # 좌측 엔드포인트 목록, 프리셋, 검색/필터
│   ├── TrafficInspector.tsx    # 하단 실시간 트래픽 로그 및 메트릭 바
│   └── CodeSnippetModal.tsx    # 클라이언트 호출 코드 생성 모달
└── App.tsx                     # 메인 워크스페이스 레이아웃 조립
