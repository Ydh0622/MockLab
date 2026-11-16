export interface HeaderItem {
  id: string
  key: string
  value: string
}

export interface ResponseRule {
  id: string
  name: string
  status: number
  responseBody: string
  conditionType?: 'none' | 'query' | 'body'
  conditionKey?: string
  conditionValue?: string
}

export interface MockEndpoint {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  status: number
  responseBody: string
  delay: number
  enabled: boolean
  requireAuth?: boolean
  failureRate?: number
  headers?: HeaderItem[]
  rules?: ResponseRule[]
  activeRuleId?: string | null
  useStatefulDb?: boolean
  collectionName?: string
}

export interface NetworkLog {
  id: string
  timestamp: string
  method: string
  path: string
  status: number
  duration: number
  responseBody: string
  matchedParams?: Record<string, string>
  matchedQuery?: Record<string, string>
  requestBody?: string
  responseHeaders?: Record<string, string>
  errorReason?: 'AUTH_GUARD' | 'CHAOS_MODE'
  matchedRuleName?: string
  statefulAction?: string
}

export interface Preset {
  id: string
  name: string
  endpoints: MockEndpoint[]
}

export type SnippetFormat = 'fetch' | 'axios' | 'curl' | 'rq'

export const TEMPLATE_TOKENS = [
  { label: 'UUID', token: '{{$uuid}}' },
  { label: 'Timestamp', token: '{{$timestamp}}' },
  { label: 'Random Int', token: '{{$randomInt}}' },
  { label: 'Random Bool', token: '{{$randomBoolean}}' },
  { label: 'Path :id', token: '{{params.id}}' },
  { label: 'Query 값', token: '{{query.role}}' },
  { label: 'Body 값', token: '{{body.username}}' },
]