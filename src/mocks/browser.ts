import { http, HttpResponse, delay as mswDelay } from 'msw'
import { setupWorker } from 'msw/browser'
import { useMockStore, MockEndpoint } from '../store/useMockStore'

export const worker = setupWorker()

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

      return http[method](ep.path, async ({ request, params }) => {
        const startTime = performance.now()

        if (ep.delay > 0) {
          await mswDelay(ep.delay)
        }

        const interpolatedBodyString = interpolateBody(ep.responseBody, params || {})

        let parsedBody = {}
        try {
          parsedBody = JSON.parse(interpolatedBodyString)
        } catch {
          parsedBody = { raw: interpolatedBodyString }
        }

        const duration = Math.round(performance.now() - startTime)
        const requestUrl = new URL(request.url)

        useMockStore.getState().addLog({
          method: ep.method,
          path: requestUrl.pathname + requestUrl.search,
          status: ep.status,
          duration,
          responseBody: JSON.stringify(parsedBody, null, 2),
          matchedParams: params as Record<string, string>,
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