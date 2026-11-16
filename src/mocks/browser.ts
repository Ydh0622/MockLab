import { http, HttpResponse, delay as mswDelay } from 'msw'
import { setupWorker } from 'msw/browser'
import { MockEndpoint } from '../types/mock'
import { useMockStore } from '../store/useMockStore'
import { interpolateBody, resolveMatchingRule } from './interpolator'
import { executeStatefulCrud } from './statefulCrud'

export const worker = setupWorker()

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

        const customHeaders: Record<string, string> = {}
        ;(ep.headers || []).forEach((h) => {
          if (h.key.trim()) {
            customHeaders[h.key.trim()] = h.value
          }
        })

        // Authorization Bearer 토큰 검증
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

        // 설정된 장애 확률에 따라 무작위 500 에러 반환
        const failureRate = ep.failureRate || 0
        if (failureRate > 0 && Math.random() * 100 < failureRate) {
          const duration = Math.round(performance.now() - startTime)
          const chaosErrorBody = {
            error: 'Internal Server Error (Chaos Mode)',
            message: `${failureRate}% 확률 설정에 의해 발생한 무작위 서버 장애입니다.`,
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

        // 가상 CRUD DB 모드가 활성화된 경우 컬렉션 기반으로 응답 처리
        if (ep.useStatefulDb) {
          const crudResult = executeStatefulCrud(
            ep,
            (params as Record<string, any>) || {},
            queryObj,
            reqBodyObj
          )
          const duration = Math.round(performance.now() - startTime)

          useMockStore.getState().addLog({
            method: ep.method,
            path: requestUrl.pathname + requestUrl.search,
            status: crudResult.status,
            duration,
            responseBody: JSON.stringify(crudResult.body, null, 2),
            matchedParams: params as Record<string, string>,
            matchedQuery: Object.keys(queryObj).length > 0 ? queryObj : undefined,
            requestBody: rawReqBody || undefined,
            responseHeaders: Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
            statefulAction: crudResult.actionLabel,
          })

          return HttpResponse.json(crudResult.body, {
            status: crudResult.status,
            headers: customHeaders,
          })
        }

        // 일반 모드: 조건부 응답 규칙 매칭 확인 후 템플릿 치환
        const matchedRule = resolveMatchingRule(ep, queryObj, reqBodyObj)
        const targetStatus = matchedRule ? matchedRule.status : ep.status
        const targetBodyTemplate = matchedRule ? matchedRule.responseBody : ep.responseBody

        const interpolatedBodyString = interpolateBody(targetBodyTemplate, {
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
          status: targetStatus,
          duration,
          responseBody: JSON.stringify(parsedBody, null, 2),
          matchedParams: params as Record<string, string>,
          matchedQuery: Object.keys(queryObj).length > 0 ? queryObj : undefined,
          requestBody: rawReqBody || undefined,
          responseHeaders: Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
          matchedRuleName: matchedRule ? matchedRule.name : undefined,
        })

        return HttpResponse.json(parsedBody, {
          status: targetStatus,
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