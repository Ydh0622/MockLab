import { MockEndpoint, ResponseRule } from '../types/mock'

export interface InterpolationContext {
  params: Record<string, any>
  query: Record<string, string>
  body: Record<string, any>
}

// 응답 본문 내 동적 템플릿 변수 및 매크로 치환
export function interpolateBody(template: string, ctx: InterpolationContext): string {
  let result = template

  result = result.replace(/\{\{\s*\$uuid\s*\}\}/g, () => crypto.randomUUID())
  result = result.replace(/\{\{\s*\$timestamp\s*\}\}/g, () => new Date().toISOString())
  result = result.replace(/\{\{\s*\$randomInt\s*\}\}/g, () => String(Math.floor(Math.random() * 1000) + 1))
  result = result.replace(/\{\{\s*\$randomBoolean\s*\}\}/g, () => String(Math.random() > 0.5))

  Object.keys(ctx.params).forEach((key) => {
    const regex = new RegExp(`\\{\\{\\s*params\\.${key}\\s*\\}\\}`, 'g')
    result = result.replace(regex, String(ctx.params[key]))
  })

  result = result.replace(/\{\{\s*query\.([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return ctx.query[key] !== undefined ? String(ctx.query[key]) : 'null'
  })

  result = result.replace(/\{\{\s*body\.([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return ctx.body && ctx.body[key] !== undefined ? String(ctx.body[key]) : 'null'
  })

  return result
}

// 요청 조건과 일치하는 다중 응답 규칙 탐색
export function resolveMatchingRule(
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