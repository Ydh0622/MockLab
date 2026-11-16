import { MockEndpoint, SnippetFormat } from '../types/mock'

// Path 파라미터(:id 등)를 기본값 '1'로 변환하고 Query String 결합
export function buildTestableUrl(path: string, queryString: string): string {
  const basePath = path.replace(/:([a-zA-Z0-9_]+)/g, '1')
  const cleanQuery = queryString.trim().replace(/^\?/, '')
  return cleanQuery ? `${basePath}?${cleanQuery}` : basePath
}

// 선택한 포맷에 맞는 클라이언트 호출 코드 문자열 생성
export function generateClientSnippet(
  endpoint: MockEndpoint,
  format: SnippetFormat,
  testQuery: string,
  testBody: string,
  includeTestAuth: boolean,
  testToken: string
): string {
  const testUrl = buildTestableUrl(endpoint.path, testQuery)
  const hasBody = endpoint.method === 'POST' || endpoint.method === 'PUT'
  const needAuth = endpoint.requireAuth || includeTestAuth

  const headersObj: Record<string, string> = {}
  if (hasBody) headersObj['Content-Type'] = 'application/json'
  if (needAuth && testToken.trim()) headersObj['Authorization'] = testToken.trim()

  if (format === 'fetch') {
    const optionsParts = [`  method: '${endpoint.method}'`]
    if (Object.keys(headersObj).length > 0) {
      optionsParts.push(`  headers: ${JSON.stringify(headersObj, null, 4).replace(/\n/g, '\n  ')}`)
    }
    if (hasBody) optionsParts.push(`  body: JSON.stringify(${testBody})`)
    return `fetch('${testUrl}', {\n${optionsParts.join(',\n')}\n})\n  .then((res) => res.json())\n  .then((data) => console.log(data));`
  }

  if (format === 'axios') {
    const configStr =
      Object.keys(headersObj).length > 0 ? `, {\n  headers: ${JSON.stringify(headersObj)}\n}` : ''
    if (hasBody) {
      return `import axios from 'axios';\n\nconst response = await axios.${endpoint.method.toLowerCase()}('${testUrl}', ${testBody}${configStr});\nconsole.log(response.data);`
    }
    return `import axios from 'axios';\n\nconst response = await axios.${endpoint.method.toLowerCase()}('${testUrl}'${configStr});\nconsole.log(response.data);`
  }

  if (format === 'curl') {
    const headerFlags = Object.entries(headersObj)
      .map(([k, v]) => `-H "${k}: ${v}"`)
      .join(' \\\n  ')
    const bodyFlag = hasBody ? ` \\\n  -d '${testBody}'` : ''
    return `curl -X ${endpoint.method} "${window.location.origin}${testUrl}"${
      headerFlags ? ` \\\n  ${headerFlags}` : ''
    }${bodyFlag}`
  }

  if (endpoint.method === 'GET') {
    return `import { useQuery } from '@tanstack/react-query';\n\nexport function useMockResource() {\n  return useQuery({\n    queryKey: ['${endpoint.path}'],\n    queryFn: async () => {\n      const res = await fetch('${testUrl}');\n      if (!res.ok) throw new Error('Network error');\n      return res.json();\n    },\n  });\n}`
  }

  return `import { useMutation } from '@tanstack/react-query';\n\nexport function useMockMutation() {\n  return useMutation({\n    mutationFn: async (payload: Record<string, unknown>) => {\n      const res = await fetch('${testUrl}', {\n        method: '${endpoint.method}',\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify(payload),\n      });\n      if (!res.ok) throw new Error('Request failed');\n      return res.json();\n    },\n  });\n}`
}