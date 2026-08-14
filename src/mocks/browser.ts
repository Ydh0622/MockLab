import { setupWorker } from 'msw/browser'
import { http, HttpResponse } from 'msw'
import { useMockStore } from '../store/useMockStore'

// Zustand 스토어의 엔드포인트를 MSW 핸들러 배열로 변환하는 함수
export const createDynamicHandlers = () => {
  const { endpoints } = useMockStore.getState()

  return endpoints
    .filter((ep) => ep.enabled)
    .map((ep) => {
      const method = ep.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'

      return http[method](ep.path, () => {
        let responseData: any

        try {
          responseData = JSON.parse(ep.responseBody)
        } catch {
          responseData = ep.responseBody
        }

        return HttpResponse.json(responseData, { status: ep.status })
      })
    })
}

// MSW 서비스 워커 생성
export const worker = setupWorker()

// 스토어 변경 시 MSW 핸들러 실시간 업데이트 구독
export const setupStoreSubscription = () => {
  // 초기 핸들러 등록
  worker.use(...createDynamicHandlers())

  // 스토어 상태 변경 시 동적으로 핸들러 교체
  useMockStore.subscribe(() => {
    worker.resetHandlers(...createDynamicHandlers())
  })
}