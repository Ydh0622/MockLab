// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { worker, setupStoreSubscription } from './mocks/browser'

async function enableMocking() {
  if (import.meta.env.DEV) {
    setupStoreSubscription()

    return worker.start({
      // MSW가 모킹하지 않는 내부 요청(HMR, Vite 모듈, HTML 파일 등)을 그냥 통과시킵니다.
      onUnhandledRequest: 'bypass',
      // 서비스 워커 스코프 설정
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    })
  }
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})