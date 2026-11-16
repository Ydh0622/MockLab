import { http, HttpResponse, delay as mswDelay } from 'msw'
import { setupWorker } from 'msw/browser'
import { useMockStore, MockEndpoint, ResponseRule } from '../store/useMockStore'

export const worker = setupWorker()

interface InterpolationContext {
  params: Record<string, any>
  query: Record<string, string>
  body: Record<string, any>
}

// 응답 본문 내 동적 템플릿 변수 및 매크로 치환
function interpolateBody(template: string, ctx: InterpolationContext) {
  let result = template

  // 랜덤 데이터 매크로 치환
  result = result.replace(/\{\{\s*\$uuid\s*\}\}/g, () => crypto.randomUUID())
  result = result.replace(/\{\{\s*\$timestamp\s*\}\}/g, () => new Date().toISOString())
  result = result.replace(/\{\{\s*\$randomInt\s*\}\}/g, () => String(Math.floor(Math.random() * 1000) + 1))
  result = result.replace(/\{\{\s*\$randomBoolean\s*\}\}/g, () => String(Math.random() > 0.5))

  // Path 파라미터 치환
  Object.keys(ctx.params).forEach((key) => {
    const regex = new RegExp(`\\{\\{\\s*params\\.${key}\\s*\\}\\}`, 'g')
    result = result.replace(regex, String(ctx.params[key]))
  })

  // Query 파라미터 치환
  result = result.replace(/\{\{\s*query\.([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return ctx.query[key] !== undefined ? String(ctx.query[key]) : `null`
  })

  // Request Body 필드 치환
  result = result.replace(/\{\{\s*body\.([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return ctx.body && ctx.body[key] !== undefined ? String(ctx.body[key]) : `null`
  })

  return result
}

// 요청 조건과 일치하는 응답 규칙 탐색
function resolveMatchingRule(
  ep: MockEndpoint,
  queryObj: Record<string, string>,
  reqBodyObj: Record<string, any>
): ResponseRule | null {
  const rules = ep.rules || []
  if (rules.length === 0) return null

  if (ep.activeRuleId) {
    const forced = rules.find((r) => r.id === ep.activeRuleId)
    if (forced) return forced
  }

  for (const rule of rules) {
    if (rule.conditionType === 'query' && rule.conditionKey) {
      if (String(queryObj[rule.conditionKey]) === String(rule.conditionValue || '')) {
        return rule
      }
    } else if (rule.conditionType === 'body' && rule.conditionKey) {
      if (reqBodyObj && String(reqBodyObj[rule.conditionKey]) === String(rule.conditionValue || '')) {
        return rule
      }
    }
  }

  return null
}

// 인메모리 가상 DB CRUD 실행기
function executeStatefulCrud(
  ep: MockEndpoint,
  params: Record<string, any>,
  queryObj: Record<string, string>,
  reqBodyObj: Record<string, any>
): { status: number; body: any; actionLabel: string } {
  const colName = (ep.collectionName || 'users').trim()
  const store = useMockStore.getState()
  const list = [...(store.collections[colName] || [])]
  const targetId = params.id !== undefined ? String(params.id) : undefined

  if (ep.method === 'GET') {
    if (targetId) {
      const found = list.find((item) => String(item.id) === targetId)
      if (!found) {
        return {
          status: 404,
          body: { error: 'Not Found', message: `ID '${targetId}' 항목을 ${colName}에서 찾을 수 없습니다.` },
          actionLabel: `DB 단건 조회 실패 (${colName}#${targetId})`,
        }
      }
      return {
        status: 200,
        body: found,
        actionLabel: `DB 단건 조회 (${colName}#${targetId})`,
      }
    }

    // Query 파라미터 필터링 지원
    const filtered = list.filter((item) =>
      Object.entries(queryObj).every(([k, v]) => String(item[k]) === String(v))
    )
    return {
      status: 200,
      body: filtered,
      actionLabel: `DB 목록 조회 (${colName}: ${filtered.length}건)`,
    }
  }

  if (ep.method === 'POST') {
    const newItem = {
      id: reqBodyObj.id ? String(reqBodyObj.id) : String(Date.now()).slice(-4),
      ...reqBodyObj,
      createdAt: new Date().toISOString(),
    }
    store.setCollectionData(colName, [...list, newItem])
    return {
      status: 201,
      body: newItem,
      actionLabel: `DB 항목 생성 (${colName}#${newItem.id})`,
    }
  }

  if (ep.method === 'PUT') {
    const idToUpdate = targetId || (reqBodyObj.id ? String(reqBodyObj.id) : '')
    const index = list.findIndex((item) => String(item.id) === idToUpdate)
    if (index === -1) {
      return {
        status: 404,
        body: { error: 'Not Found', message: `수정할 ID '${idToUpdate}' 항목이 없습니다.` },
        actionLabel: `DB 수정 실패 (${colName}#${idToUpdate})`,
      }
    }
    const updatedItem = { ...list[index], ...reqBodyObj, updatedAt: new Date().toISOString() }
    list[index] = updatedItem
    store.setCollectionData(colName, list)
    return {
      status: 200,
      body: updatedItem,
      actionLabel: `DB 항목 수정 (${colName}#${idToUpdate})`,
    }
  }

  if (ep.method === 'DELETE') {
    const idToDelete = targetId || queryObj.id || ''
    const nextList = list.filter((item) => String(item.id) !== String(idToDelete))
    if (nextList.length === list.length) {
      return {
        status: 404,
        body: { error: 'Not Found', message: `삭제할 ID '${idToDelete}' 항목이 없습니다.` },
        actionLabel: `DB 삭제 실패 (${colName}#${idToDelete})`,
      }
    }
    store.setCollectionData(colName, nextList)
    return {
      status: 200,
      body: { deletedId: idToDelete, message: '정상적으로 삭제되었습니다.' },
      actionLabel: `DB 항목 삭제 (${colName}#${idToDelete})`,
    }
  }

  return { status: ep.status, body: {}, actionLabel: 'DB 작업 없음' }
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