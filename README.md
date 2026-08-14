# 🧪 MockLab

> **웹 기반 동적 API Mocking & Network Inspection 도구**
> 백엔드 API 개발 완료 여부와 상관없이, 프론트엔드 브라우저 상에서 동적으로 API 응답·상태 코드·네트워크 지연 시간을 제어하고 테스트할 수 있는 프론트엔드 전용 API Mocking 도구입니다.

---

## ✨ Key Features

- **⚡ 동적 MSW 핸들러 바인딩**: Zustand 스토어 상태 변경 시 앱 새로고침 없이 즉시 네트워크 가로채기 규칙이 실시간 갱신됩니다.
- **🎨 Monaco Editor 통합**: VS Code 기반 에디터로 JSON Response Body에 대한 신속한 편집 및 문법 검증을 지원합니다.
- **⏱️ 네트워크 지연(Delay) 시뮬레이션**: API 응답 대기 시간을 임의로 설정하여 로딩 스피너 및 스켈레톤 UI 동작을 손쉽게 검증할 수 있습니다.
- **📜 실시간 Inspector Log**: MSW가 가로챈 모든 HTTP 요청/응답 트래픽을 화면 하단 패널에서 실시간 모니터링합니다.
- **💾 데이터 영속성 & 공유**: `localStorage` 자동 저장으로 작업 내역을 보존하며, `.json` 파일 내보내기/가져오기로 팀원 간 Mock 설정을 공유할 수 있습니다.

---

## 🛠️ Tech Stack

- **Core**: React 19, TypeScript, Vite
- **State**: Zustand (`persist` middleware)
- **Mocking**: MSW (Mock Service Worker) v2
- **Editor & UI**: Monaco Editor (`@monaco-editor/react`), Tailwind CSS, Lucide Icons

---

## 🚀 Getting Started

```bash
# 1. Repository Clone & Install
git clone [https://github.com/your-username/mock-lab.git](https://github.com/your-username/mock-lab.git)
cd mock-lab
npm install

# 2. Run Development Server
npm run dev
