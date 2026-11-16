import { MockEndpoint } from '../types/mock'

// OpenAPI/Swagger JSON 명세를 MockEndpoint 배열로 변환
export function parseSwaggerSpec(swaggerJson: any): MockEndpoint[] {
  const importedEndpoints: MockEndpoint[] = []
  const paths = swaggerJson?.paths || {}

  Object.keys(paths).forEach((pathKey) => {
    const methods = paths[pathKey]
    Object.keys(methods).forEach((methodKey) => {
      const upperMethod = methodKey.toUpperCase() as MockEndpoint['method']
      if (['GET', 'POST', 'PUT', 'DELETE'].includes(upperMethod)) {
        const formattedPath = pathKey.replace(/\{([^}]+)\}/g, ':$1')
        importedEndpoints.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          method: upperMethod,
          path: formattedPath,
          status: 200,
          responseBody: JSON.stringify(
            {
              id: '{{$uuid}}',
              message: `Swagger auto-generated response for ${upperMethod} ${formattedPath}`,
              timestamp: '{{$timestamp}}',
            },
            null,
            2
          ),
          delay: 0,
          enabled: true,
          requireAuth: false,
          failureRate: 0,
          headers: [],
          activeRuleId: null,
          rules: [],
          useStatefulDb: false,
          collectionName: 'users',
        })
      }
    })
  })

  return importedEndpoints
}