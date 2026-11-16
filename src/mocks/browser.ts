import { http, HttpResponse, delay as mswDelay } from 'msw'
import { setupWorker } from 'msw/browser'
import { useMockStore, MockEndpoint } from '../store/useMockStore'

export const worker = setupWorker()

interface InterpolationContext {
  params: Record<string, any>
  query: Record<string, string>
  body: Record<string, any>
}

// 💡 [Phase 2] 통합 동적 템플릿 & Mini-Faker 치환 엔진
function interpolateBody(template: string, ctx: InterpolationContext) {
  let result = template

  // 1. 내장 Mini-Faker 매크로 치환
  result = result.replace(/\{\{\s*\$uuid\s*\}\}/g, () => crypto.randomUUID())
  result = result.replace(/\{\{\s*\$timestamp\s*\}\}/g, () => new Date().toISOString())
  result = result.replace(/\{\{\s*\$randomInt\s*\}\}/g, () => String(Math.floor(Math.random() * 1000) + 1))
  result = result.replace(/\{\{\s*\$randomBoolean\s*\}\}/g, () => String(Math.random() > 0.5))

  // 2. Path Variable 치환: {{params.id}}
  Object.keys(ctx.params).forEach((key) => {
    const regex = new RegExp(`\\{\\{\\s*params\\.${key}\\s*\\}\\}`, 'g')
    result = result.replace(regex, String(ctx.params[key]))
  })

  // 3. Query Parameter 치환: {{query.role}}
  result = result.replace(/\{\{\s*query\.([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return ctx.query[key] !== undefined ? String(ctx.query[key]) : `null`
  })

  // 4. Request Body 속성 치환: {{body.username}}
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

        // URL Query String 파싱
        const requestUrl = new URL(request.url)
        const queryObj: Record<string, string> = {}
        requestUrl.searchParams.forEach((val, key) => {
          queryObj[key] = val
        })

        // Request Body 파싱 (POST, PUT 등)
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

        // 템플릿 치환 실행
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
        })

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