import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import {
  Plus,
  Trash2,
  Clock,
  Play,
  Sparkles,
  SlidersHorizontal,
  ShieldAlert,
  Flame,
  GitBranch,
  Database,
  Code2,
  RotateCcw,
} from 'lucide-react'
import { useMockStore } from './store/useMockStore'
import { HeaderItem, ResponseRule, TEMPLATE_TOKENS } from './types/mock'
import { buildTestableUrl } from './utils/codeGenerator'
import { Sidebar } from './components/Sidebar'
import { TrafficInspector } from './components/TrafficInspector'
import { CodeSnippetModal } from './components/CodeSnippetModal'

export default function App() {
  const {
    endpoints,
    selectedId,
    collections,
    updateEndpoint,
    deleteEndpoint,
    importEndpoints,
    setCollectionData,
    resetCollections,
  } = useMockStore()

  const [isSending, setIsSending] = useState(false)
  const [showTestConfig, setShowTestConfig] = useState(false)
  const [testQuery, setTestQuery] = useState('role=admin')
  const [testBody, setTestBody] = useState('{"name": "박지훈", "role": "designer"}')
  const [includeTestAuth, setIncludeTestAuth] = useState(true)
  const [testToken, setTestToken] = useState('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')

  const [activeTab, setActiveTab] = useState<'body' | 'rules' | 'headers' | 'db'>('body')
  const [showSnippetModal, setShowSnippetModal] = useState(false)

  // URL 쿼리에 공유 데이터가 있을 경우 파싱하여 스토어에 반영
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sharedData = params.get('share')
    if (sharedData) {
      try {
        const jsonStr = decodeURIComponent(escape(atob(sharedData)))
        const parsed = JSON.parse(jsonStr)
        if (Array.isArray(parsed) && parsed.length > 0) {
          importEndpoints(parsed)
          window.history.replaceState({}, document.title, window.location.pathname)
          alert(`공유 링크로부터 ${parsed.length}개의 엔드포인트를 불러왔습니다.`)
        }
      } catch {
        console.error('Failed to parse shared URL data')
      }
    }
  }, [importEndpoints])

  const selectedEndpoint = endpoints.find((ep) => ep.id === selectedId)

  const handleSendRequest = async () => {
    if (!selectedEndpoint) return
    if (!selectedEndpoint.enabled) {
      alert('비활성화된 엔드포인트입니다. 좌측 체크박스를 먼저 켜주세요.')
      return
    }

    setIsSending(true)
    const testUrl = buildTestableUrl(selectedEndpoint.path, testQuery)
    const hasBody = selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT'

    const reqHeaders: Record<string, string> = {}
    if (hasBody) reqHeaders['Content-Type'] = 'application/json'
    if (includeTestAuth && testToken.trim()) {
      reqHeaders['Authorization'] = testToken.trim()
    }

    try {
      await fetch(testUrl, {
        method: selectedEndpoint.method,
        headers: reqHeaders,
        body: hasBody ? testBody : undefined,
      })
    } catch (error) {
      console.error('Test request failed:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleInsertToken = (token: string) => {
    navigator.clipboard.writeText(token)
    alert(`클립보드에 ${token} 복사 완료. 에디터 원하는 위치에 붙여넣기(Ctrl+V) 하세요.`)
  }

  const handleAddHeader = () => {
    if (!selectedEndpoint) return
    const nextHeaders: HeaderItem[] = [
      ...(selectedEndpoint.headers || []),
      { id: `h-${Date.now()}`, key: '', value: '' },
    ]
    updateEndpoint(selectedEndpoint.id, { headers: nextHeaders })
  }

  const handleUpdateHeader = (headerId: string, field: 'key' | 'value', val: string) => {
    if (!selectedEndpoint) return
    const nextHeaders = (selectedEndpoint.headers || []).map((h) =>
      h.id === headerId ? { ...h, [field]: val } : h
    )
    updateEndpoint(selectedEndpoint.id, { headers: nextHeaders })
  }

  const handleRemoveHeader = (headerId: string) => {
    if (!selectedEndpoint) return
    const nextHeaders = (selectedEndpoint.headers || []).filter((h) => h.id !== headerId)
    updateEndpoint(selectedEndpoint.id, { headers: nextHeaders })
  }

  const handleAddRule = () => {
    if (!selectedEndpoint) return
    const newRule: ResponseRule = {
      id: `rule-${Date.now()}`,
      name: `조건부 응답 #${(selectedEndpoint.rules || []).length + 1}`,
      status: 400,
      responseBody: JSON.stringify(
        { error: 'Bad Request', message: '조건부 규칙에 의해 반환된 응답입니다.' },
        null,
        2
      ),
      conditionType: 'query',
      conditionKey: 'role',
      conditionValue: 'guest',
    }
    updateEndpoint(selectedEndpoint.id, {
      rules: [...(selectedEndpoint.rules || []), newRule],
    })
  }

  const handleUpdateRule = (ruleId: string, updated: Partial<ResponseRule>) => {
    if (!selectedEndpoint) return
    const nextRules = (selectedEndpoint.rules || []).map((r) =>
      r.id === ruleId ? { ...r, ...updated } : r
    )
    updateEndpoint(selectedEndpoint.id, { rules: nextRules })
  }

  const handleRemoveRule = (ruleId: string) => {
    if (!selectedEndpoint) return
    const nextRules = (selectedEndpoint.rules || []).filter((r) => r.id !== ruleId)
    const nextActiveId = selectedEndpoint.activeRuleId === ruleId ? null : selectedEndpoint.activeRuleId
    updateEndpoint(selectedEndpoint.id, { rules: nextRules, activeRuleId: nextActiveId })
  }

  const currentColName = (selectedEndpoint?.collectionName || 'users').trim()
  const currentColData = collections[currentColName] || []

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
        {selectedEndpoint ? (
          <>
            <header className="p-4 border-b border-slate-800 flex flex-wrap items-center gap-2.5 bg-slate-950/50">
              <select
                value={selectedEndpoint.method}
                onChange={(e) =>
                  updateEndpoint(selectedEndpoint.id, {
                    method: e.target.value as any,
                  })
                }
                className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-semibold text-indigo-300 focus:outline-none"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>

              <input
                type="text"
                value={selectedEndpoint.path}
                onChange={(e) =>
                  updateEndpoint(selectedEndpoint.id, { path: e.target.value })
                }
                className="flex-1 min-w-[180px] bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono focus:outline-none"
              />

              <button
                onClick={handleSendRequest}
                disabled={isSending}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded transition shadow-sm cursor-pointer"
              >
                <Play size={13} fill="currentColor" />
                {isSending ? '요청 중...' : 'Send'}
              </button>

              <button
                onClick={() => setShowTestConfig(!showTestConfig)}
                className={`flex items-center gap-1 border text-xs px-2.5 py-2 rounded transition cursor-pointer ${
                  showTestConfig
                    ? 'bg-indigo-950 border-indigo-600 text-indigo-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <SlidersHorizontal size={13} />
                <span>테스트 파라미터</span>
              </button>

              <button
                onClick={() => setShowSnippetModal(true)}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 text-xs px-2.5 py-2 rounded transition cursor-pointer"
              >
                <Code2 size={13} />
                <span>코드 스니펫</span>
              </button>

              <div className="h-4 w-[1px] bg-slate-800 mx-1" />

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Status:</span>
                <input
                  type="number"
                  value={selectedEndpoint.status}
                  onChange={(e) =>
                    updateEndpoint(selectedEndpoint.id, {
                      status: Number(e.target.value),
                    })
                  }
                  className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm font-mono focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400">Delay:</span>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={selectedEndpoint.delay}
                  onChange={(e) =>
                    updateEndpoint(selectedEndpoint.id, {
                      delay: Number(e.target.value),
                    })
                  }
                  className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm font-mono focus:outline-none"
                />
              </div>

              <button
                onClick={() => deleteEndpoint(selectedEndpoint.id)}
                className="p-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 rounded transition cursor-pointer"
                title="엔드포인트 삭제"
              >
                <Trash2 size={15} />
              </button>
            </header>

            <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-5 flex-wrap">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedEndpoint.requireAuth)}
                    onChange={(e) =>
                      updateEndpoint(selectedEndpoint.id, { requireAuth: e.target.checked })
                    }
                    className="accent-amber-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1 font-medium text-amber-300">
                    <ShieldAlert size={13} /> Auth 가드
                  </span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedEndpoint.useStatefulDb)}
                    onChange={(e) => {
                      updateEndpoint(selectedEndpoint.id, { useStatefulDb: e.target.checked })
                      if (e.target.checked) setActiveTab('db')
                    }}
                    className="accent-emerald-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1 font-medium text-emerald-300">
                    <Database size={13} /> 가상 CRUD DB 연동
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-medium text-rose-400">
                    <Flame size={13} /> Chaos:
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={selectedEndpoint.failureRate || 0}
                    onChange={(e) =>
                      updateEndpoint(selectedEndpoint.id, { failureRate: Number(e.target.value) })
                    }
                    className="w-20 accent-rose-500 cursor-pointer"
                  />
                  <span className="font-mono text-rose-300 w-8">
                    {selectedEndpoint.failureRate || 0}%
                  </span>
                </div>
              </div>

              <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveTab('body')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    activeTab === 'body'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Default Body
                </button>
                <button
                  onClick={() => setActiveTab('rules')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'rules'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <GitBranch size={12} />
                  Rules ({(selectedEndpoint.rules || []).length})
                </button>
                <button
                  onClick={() => setActiveTab('headers')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    activeTab === 'headers'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Headers ({(selectedEndpoint.headers || []).length})
                </button>
                <button
                  onClick={() => setActiveTab('db')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                    activeTab === 'db'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Database size={12} />
                  Stateful DB
                </button>
              </div>
            </div>

            {showTestConfig && (
              <div className="px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="text-slate-400 font-semibold whitespace-nowrap">Query (?):</span>
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="예: role=guest"
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 font-mono text-indigo-300 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                  <label className="flex items-center gap-1.5 text-slate-400 font-semibold whitespace-nowrap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTestAuth}
                      onChange={(e) => setIncludeTestAuth(e.target.checked)}
                      className="accent-amber-500"
                    />
                    Auth 헤더 전송:
                  </label>
                  <input
                    type="text"
                    disabled={!includeTestAuth}
                    value={testToken}
                    onChange={(e) => setTestToken(e.target.value)}
                    className="w-full bg-slate-950 disabled:opacity-40 border border-slate-700 rounded px-2.5 py-1 font-mono text-amber-300 focus:outline-none"
                  />
                </div>

                {(selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT') && (
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <span className="text-slate-400 font-semibold whitespace-nowrap">Body:</span>
                    <input
                      type="text"
                      value={testBody}
                      onChange={(e) => setTestBody(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 font-mono text-emerald-300 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'body' && (
              <>
                <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 whitespace-nowrap mr-1">
                    <Sparkles size={12} /> 동적 템플릿 변수 (클릭해 복사):
                  </span>
                  {TEMPLATE_TOKENS.map((item) => (
                    <button
                      key={item.token}
                      onClick={() => handleInsertToken(item.token)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-indigo-950 border border-slate-700 hover:border-indigo-600 rounded text-[11px] font-mono text-slate-300 hover:text-indigo-300 transition whitespace-nowrap cursor-pointer"
                    >
                      {item.label} <span className="text-slate-500">{item.token}</span>
                    </button>
                  ))}
                </div>

                <div className="flex-[3] p-2 relative">
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    theme="vs-dark"
                    value={selectedEndpoint.responseBody}
                    onChange={(value) =>
                      updateEndpoint(selectedEndpoint.id, {
                        responseBody: value || '',
                      })
                    }
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                    }}
                  />
                </div>
              </>
            )}

            {activeTab === 'rules' && (
              <div className="flex-[3] p-4 overflow-y-auto bg-slate-900 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                      <GitBranch size={15} className="text-sky-400" />
                      다중 응답 분기 규칙 (Multiple Response Rules)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      특정 Query/Body 조건이 일치할 때 자동 반환되거나, 수동으로 고정할 응답 케이스를 관리합니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedEndpoint.activeRuleId || ''}
                      onChange={(e) =>
                        updateEndpoint(selectedEndpoint.id, {
                          activeRuleId: e.target.value || null,
                        })
                      }
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-sky-300 font-medium focus:outline-none"
                    >
                      <option value="">자동 조건 매칭 (기본값)</option>
                      {(selectedEndpoint.rules || []).map((r) => (
                        <option key={r.id} value={r.id}>
                          강제 고정: {r.name} ({r.status})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddRule}
                      className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded font-medium transition cursor-pointer"
                    >
                      <Plus size={14} /> 규칙 추가
                    </button>
                  </div>
                </div>

                {(selectedEndpoint.rules || []).length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-800 rounded-lg text-center text-xs text-slate-500">
                    등록된 조건부 응답 규칙이 없습니다. 우측 상단 [규칙 추가]를 눌러 예외 케이스를 만들어 보세요.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(selectedEndpoint.rules || []).map((rule) => (
                      <div
                        key={rule.id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={rule.name}
                            onChange={(e) => handleUpdateRule(rule.id, { name: e.target.value })}
                            placeholder="규칙 이름 (예: 게스트 403 차단)"
                            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none"
                          />

                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400">Status:</span>
                            <input
                              type="number"
                              value={rule.status}
                              onChange={(e) =>
                                handleUpdateRule(rule.id, { status: Number(e.target.value) })
                              }
                              className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-amber-300 focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="text-[11px] text-slate-400">발동 조건:</span>
                            <select
                              value={rule.conditionType || 'none'}
                              onChange={(e) =>
                                handleUpdateRule(rule.id, {
                                  conditionType: e.target.value as ResponseRule['conditionType'],
                                })
                              }
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-indigo-300 focus:outline-none"
                            >
                              <option value="none">수동 선택 시에만</option>
                              <option value="query">Query 파라미터 일치</option>
                              <option value="body">Body 필드 일치</option>
                            </select>

                            {rule.conditionType && rule.conditionType !== 'none' && (
                              <>
                                <input
                                  type="text"
                                  placeholder="Key (예: role)"
                                  value={rule.conditionKey || ''}
                                  onChange={(e) =>
                                    handleUpdateRule(rule.id, { conditionKey: e.target.value })
                                  }
                                  className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-sky-300 focus:outline-none"
                                />
                                <span className="text-slate-500 text-xs">=</span>
                                <input
                                  type="text"
                                  placeholder="Value (예: guest)"
                                  value={rule.conditionValue || ''}
                                  onChange={(e) =>
                                    handleUpdateRule(rule.id, { conditionValue: e.target.value })
                                  }
                                  className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-300 focus:outline-none"
                                />
                              </>
                            )}

                            <button
                              onClick={() => handleRemoveRule(rule.id)}
                              className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 rounded transition cursor-pointer ml-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={4}
                          value={rule.responseBody}
                          onChange={(e) =>
                            handleUpdateRule(rule.id, { responseBody: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded p-2 font-mono text-xs text-emerald-300 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'headers' && (
              <div className="flex-[3] p-4 overflow-y-auto bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Custom Response Headers</h3>
                    <p className="text-xs text-slate-400">
                      이 엔드포인트 응답에 포함할 HTTP 헤더(예: X-Total-Count, Cache-Control)를 설정합니다.
                    </p>
                  </div>
                  <button
                    onClick={handleAddHeader}
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded font-medium transition cursor-pointer"
                  >
                    <Plus size={14} /> 헤더 추가
                  </button>
                </div>

                <div className="space-y-2">
                  {(selectedEndpoint.headers || []).length === 0 ? (
                    <div className="p-6 border border-dashed border-slate-800 rounded-lg text-center text-xs text-slate-500">
                      등록된 커스텀 응답 헤더가 없습니다. 우측 상단 [헤더 추가] 버튼을 눌러보세요.
                    </div>
                  ) : (
                    (selectedEndpoint.headers || []).map((h) => (
                      <div key={h.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Header Key (예: X-Total-Count)"
                          value={h.key}
                          onChange={(e) => handleUpdateHeader(h.id, 'key', e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-indigo-300 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Header Value (예: 100)"
                          value={h.value}
                          onChange={(e) => handleUpdateHeader(h.id, 'value', e.target.value)}
                          className="flex-[2] bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none"
                        />
                        <button
                          onClick={() => handleRemoveHeader(h.id)}
                          className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 rounded transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'db' && (
              <div className="flex-[3] p-4 overflow-y-auto bg-slate-900 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                      <Database size={15} className="text-emerald-400" />
                      인메모리 가상 CRUD 데이터베이스 (Stateful DB)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      활성화 시 정적 JSON 대신 컬렉션 배열을 기반으로 GET(조회), POST(추가), PUT(수정), DELETE(삭제)가 실제 반영됩니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">연결할 컬렉션 이름:</span>
                    <input
                      type="text"
                      value={selectedEndpoint.collectionName || 'users'}
                      onChange={(e) =>
                        updateEndpoint(selectedEndpoint.id, { collectionName: e.target.value })
                      }
                      placeholder="예: users, todos"
                      className="w-32 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-emerald-300 focus:outline-none"
                    />
                    <button
                      onClick={resetCollections}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded transition cursor-pointer"
                      title="초기 샘플 데이터로 복원"
                    >
                      <RotateCcw size={13} /> DB 초기화
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400 font-mono">
                      Collection: "{currentColName}" (현재 {currentColData.length}건 저장됨)
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      아래 JSON 배열을 직접 수정하면 즉시 가상 DB에 반영됩니다.
                    </span>
                  </div>
                  <textarea
                    rows={10}
                    value={JSON.stringify(currentColData, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value)
                        if (Array.isArray(parsed)) {
                          setCollectionData(currentColName, parsed)
                        }
                      } catch {
                        // JSON 타이핑 중 파싱 에러 무시
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 font-mono text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <TrafficInspector />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            엔드포인트를 선택하거나 신규 작성해 주세요.
          </div>
        )}
      </main>

      {showSnippetModal && selectedEndpoint && (
        <CodeSnippetModal
          endpoint={selectedEndpoint}
          testQuery={testQuery}
          testBody={testBody}
          includeTestAuth={includeTestAuth}
          testToken={testToken}
          onClose={() => setShowSnippetModal(false)}
        />
      )}
    </div>
  )
}