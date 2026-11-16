import { http, HttpResponse, delay as mswDelay } from 'msw'
import { setupWorker } from 'msw/browser'
import { useMockStore, MockEndpoint } from '../store/useMockStore'

export const worker = setupWorker()

interface InterpolationContext {
  params: Record<string, any>
  query: Record<string, string>
  body: Record<string, any>
}

function interpolateBody(template: string, ctx: InterpolationContext) {
  let result = template

  // 1. 내장 Mini-Faker 매크로 치환
  result = result.replace(/\{\{\s*\$uuid\s*\}\}/g, () => crypto.randomUUID())
  result = result.replace(/\{\{\s*\$timestamp\s*\}\}/g, () => new Date().toISOString())
  result = result.replace(/\{\{\s*\$randomInt\s*\}\}/g, () => String(Math.floor(Math.random() * 1000) + 1))
  result = result.replace(/\{\{\s*\$randomBoolean\s*\}\}/g, () => String(Math.random() > 0.5))

  // 2. Path Variable 치환
  Object.keys(ctx.params).forEach((key) => {
    const regex = new RegExp(`\\{\\{\\s*params\\.${key}\\s*\\}\\}`, 'g')
    result = result.replace(regex, String(ctx.params[key]))
  })

  // 3. Query Parameter 치환
  result = result.replace(/\{\{\s*query\.([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return ctx.query[key] !== undefined ? String(ctx.query[key]) : `null`
  })

  // 4. Request Body 속성 치환
  result = result.replace(/\{\{\s*body\.([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return ctx.body && ctx.body[key] !== undefined ? String(ctx.body[key]) : `null`
  })

  return result
}

function createDynamicHandlers(endpoints: MockEndpoint[]) {
  return endpoints
    .filter((ep) => ep.enabled)
    .map((ep) => {
      const method = ep.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'

      return http[method](ep.path, async ({ request, params }) => {
        const startTime = performance.now()

        if (ep.delay > 0) {
          await mswDelay(ep.delay)
        }

        const requestUrl = new URL(request.url)
        const queryObj: Record<string, string> = {}
        requestUrl.searchParams.forEach((val, key) => {
          queryObj[key] = val
        })

        let reqBodyObj: Record<string, any> = {}
        let rawReqBody = ''
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          try {
            rawReqBody = await request.clone().text()
            if (rawReqBody) {
              reqBodyObj = JSON.parse(rawReqBody)
            }
          } catch {
            reqBodyObj = {}
          }
        }

        // 커스텀 응답 헤더 구성
        const customHeaders: Record<string, string> = {}
        ;(ep.headers || []).forEach((h) => {
          if (h.key.trim()) {
            customHeaders[h.key.trim()] = h.value
          }
        })

        // 💡 [Phase 3] 1. Auth Token Guard 검사
        if (ep.requireAuth) {
          const authHeader = request.headers.get('Authorization')
          if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.trim() === 'Bearer') {
            const duration = Math.round(performance.now() - startTime)
            const authErrorBody = {
              error: 'Unauthorized',
              message: '유효한 Authorization Bearer 토큰이 필요합니다.',
              timestamp: new Date().toISOString(),
            }

            useMockStore.getState().addLog({
              method: ep.method,
              path: requestUrl.pathname + requestUrl.search,
              status: 401,
              duration,
              responseBody: JSON.stringify(authErrorBody, null, 2),
              matchedParams: params as Record<string, string>,
              matchedQuery: Object.keys(queryObj).length > 0 ? queryObj : undefined,
              requestBody: rawReqBody || undefined,
              responseHeaders: customHeaders,
              errorReason: 'AUTH_GUARD',
            })

            return HttpResponse.json(authErrorBody, { status: 401, headers: customHeaders })
          }
        }

        // 💡 [Phase 3] 2. Chaos Mode (확률적 500 에러 시뮬레이션)
        const failureRate = ep.failureRate || 0
        if (failureRate > 0 && Math.random() * 100 < failureRate) {
          const duration = Math.round(performance.now() - startTime)
          const chaosErrorBody = {
            error: 'Internal Server Error (Chaos Mode)',
            message: `Chaos Engineering: ${failureRate}% 확률 설정에 의해 발생한 무작위 서버 장애입니다.`,
            timestamp: new Date().toISOString(),
          }

          useMockStore.getState().addLog({
            method: ep.method,
            path: requestUrl.pathname + requestUrl.search,
            status: 500,
            duration,
            responseBody: JSON.stringify(chaosErrorBody, null, 2),
            matchedParams: params as Record<string, string>,
            matchedQuery: Object.keys(queryObj).length > 0 ? queryObj : undefined,
            requestBody: rawReqBody || undefined,
            responseHeaders: customHeaders,
            errorReason: 'CHAOS_MODE',
          })

          return HttpResponse.json(chaosErrorBody, { status: 500, headers: customHeaders })
        }

        // 3. 정상 응답 처리
        const interpolatedBodyString = interpolateBody(ep.responseBody, {
          params: (params as Record<string, any>) || {},
          query: queryObj,
          body: reqBodyObj,
        })

        let parsedBody = {}
        try {
          parsedBody = JSON.parse(interpolatedBodyString)
        } catch {
          parsedBody = { raw: interpolatedBodyString }
        }

        const duration = Math.round(performance.now() - startTime)

        useMockStore.getState().addLog({
          method: ep.method,
          path: requestUrl.pathname + requestUrl.search,
          status: ep.status,
          duration,
          responseBody: JSON.stringify(parsedBody, null, 2),
          matchedParams: params as Record<string, string>,
          matchedQuery: Object.keys(queryObj).length > 0 ? queryObj : undefined,
          requestBody: rawReqBody || undefined,
          responseHeaders: Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
        })

        return HttpResponse.json(parsedBody, {
          status: ep.status,
          headers: customHeaders,
        })
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