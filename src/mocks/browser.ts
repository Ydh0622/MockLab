import { http, HttpResponse, delay as mswDelay } from 'msw'
import { setupWorker } from 'msw/browser'
import { useMockStore, MockEndpoint } from '../store/useMockStore'

export const worker = setupWorker()

// 💡 Response Body 내의 {{params.xxx}} 동적 변수를 URL Path 파라미터 값으로 치환하는 함수
function interpolateBody(template: string, params: Record<string, any>) {
  let result = template
  Object.keys(params).forEach((key) => {
    const value = params[key]
    const regex = new RegExp(`\\{\\{\\s*params\\.${key}\\s*\\}\\}`, 'g')
    result = result.replace(regex, String(value))
  })
  return result
}

function createDynamicHandlers(endpoints: MockEndpoint[]) {
  return endpoints
    .filter((ep) => ep.enabled)
    .map((ep) => {
      const method = ep.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'

      return http[method](ep.path, async ({ params }) => {
        // 1. 지연 시간 적용
        if (ep.delay > 0) {
          await mswDelay(ep.delay)
        }

        // 2. 실시간 로그 기록
        useMockStore.getState().addLog({
          method: ep.method,
          path: ep.path,
          status: ep.status,
          matchedParams: params as Record<string, string>,
        })

        // 3. Path Variable 치환 후 JSON 파싱
        const interpolatedBodyString = interpolateBody(ep.responseBody, params || {})

        let parsedBody = {}
        try {
          parsedBody = JSON.parse(interpolatedBodyString)
        } catch {
          parsedBody = { raw: interpolatedBodyString }
        }

        return HttpResponse.json(parsedBody, { status: ep.status })
      })
    })
}

export function setupStoreSubscription() {
  const updateHandlers = (endpoints: MockEndpoint[]) => {
    const handlers = createDynamicHandlers(endpoints)
    worker.use(...handlers)
  }

  updateHandlers(useMockStore.getState().endpoints)

  useMockStore.subscribe((state) => {
    updateHandlers(state.endpoints)
  })
}