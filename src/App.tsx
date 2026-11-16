import React, { useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  Plus,
  Trash2,
  Download,
  Upload,
  Terminal,
  Clock,
  Layers,
  FileCode,
  Play,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react'
import { useMockStore } from './store/useMockStore'

const TEMPLATE_TOKENS = [
  { label: 'UUID', token: '{{$uuid}}' },
  { label: 'Timestamp', token: '{{$timestamp}}' },
  { label: 'Random Int', token: '{{$randomInt}}' },
  { label: 'Random Bool', token: '{{$randomBoolean}}' },
  { label: 'Path :id', token: '{{params.id}}' },
  { label: 'Query 값', token: '{{query.role}}' },
  { label: 'Body 값', token: '{{body.username}}' },
]

export default function App() {
  const {
    endpoints,
    selectedId,
    logs,
    presets,
    activePresetId,
    selectEndpoint,
    addEndpoint,
    updateEndpoint,
    deleteEndpoint,
    toggleEndpoint,
    clearLogs,
    importEndpoints,
    saveCurrentAsPreset,
    loadPreset,
    importSwaggerSpec,
  } = useMockStore()

  const jsonFileInputRef = useRef<HTMLInputElement>(null)
  const swaggerFileInputRef = useRef<HTMLInputElement>(null)
  const [newPresetName, setNewPresetName] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  // 💡 [Phase 2] 인앱 테스트용 Query & Request Body 상태
  const [showTestConfig, setShowTestConfig] = useState(false)
  const [testQuery, setTestQuery] = useState('role=admin')
  const [testBody, setTestBody] = useState('{"username": "frontend_master"}')

  const selectedEndpoint = endpoints.find((ep) => ep.id === selectedId)

  const getTestablePath = (path: string) => {
    const basePath = path.replace(/:([a-zA-Z0-9_]+)/g, '1')
    const cleanQuery = testQuery.trim().replace(/^\?/, '')
    return cleanQuery ? `${basePath}?${cleanQuery}` : basePath
  }

  // 💡 [Phase 2] Query와 Request Body를 포함하여 테스트 요청 전송
  const handleSendRequest = async () => {
    if (!selectedEndpoint) return
    if (!selectedEndpoint.enabled) {
      alert('비활성화된 엔드포인트입니다. 좌측 체크박스를 먼저 켜주세요!')
      return
    }

    setIsSending(true)
    const testUrl = getTestablePath(selectedEndpoint.path)
    const hasBody = selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT'

    try {
      await fetch(testUrl, {
        method: selectedEndpoint.method,
        headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
        body: hasBody ? testBody : undefined,
      })
    } catch (error) {
      console.error('Test request failed:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleCopyFetch = () => {
    if (!selectedEndpoint) return
    const testUrl = getTestablePath(selectedEndpoint.path)
    const hasBody = selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT'
    const options = hasBody
      ? `{ method: '${selectedEndpoint.method}', headers: { 'Content-Type': 'application/json' }, body: '${testBody}' }`
      : `{ method: '${selectedEndpoint.method}' }`

    const fetchCode = `fetch('${testUrl}', ${options})\n  .then(res => res.json())\n  .then(console.log);`
    navigator.clipboard.writeText(fetchCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // 템플릿 매크로 토큰 클립보드 복사 및 안내
  const handleInsertToken = (token: string) => {
    navigator.clipboard.writeText(token)
    alert(`클립보드에 ${token} 복사 완료! 에디터 원하는 위치에 붙여넣기(Ctrl+V) 하세요.`)
  }

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(endpoints, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `mocklab-export-${Date.now()}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader()
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8')
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string)
          if (Array.isArray(parsed)) {
            importEndpoints(parsed)
          }
        } catch {
          alert('유효하지 않은 JSON 파일입니다.')
        }
      }
    }
  }

  const handleImportSwagger = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader()
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8')
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string)
          importSwaggerSpec(parsed)
        } catch {
          alert('유효하지 않은 Swagger/OpenAPI JSON 파일입니다.')
        }
      }
    }
  }

  const handleCreatePreset = () => {
    if (!newPresetName.trim()) return
    saveCurrentAsPreset(newPresetName.trim())
    setNewPresetName('')
  }

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-950">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-wide text-indigo-400">MockLab v2.2</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              title="설정 내보내기"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition"
            >
              <Download size={14} />
            </button>
            <button
              onClick={() => jsonFileInputRef.current?.click()}
              title="설정 가져오기 (JSON)"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition"
            >
              <Upload size={14} />
            </button>
            <button
              onClick={() => swaggerFileInputRef.current?.click()}
              title="Swagger/OpenAPI 자동 파싱"
              className="p-1.5 bg-indigo-950 border border-indigo-700 hover:bg-indigo-900 rounded text-indigo-300 transition"
            >
              <FileCode size={14} />
            </button>
            <input type="file" ref={jsonFileInputRef} onChange={handleImportJson} accept=".json" className="hidden" />
            <input type="file" ref={swaggerFileInputRef} onChange={handleImportSwagger} accept=".json" className="hidden" />

            <button
              onClick={addEndpoint}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-2 py-1.5 rounded transition font-medium ml-1"
            >
              <Plus size={14} /> 추가
            </button>
          </div>
        </div>

        {/* 시나리오/프리셋 선택 바 */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-900/60 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1"><Layers size={13} /> 시나리오 프리셋</span>
          </div>
          <select
            value={activePresetId || ''}
            onChange={(e) => loadPreset(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-indigo-300 font-medium focus:outline-none"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="flex gap-1 mt-1">
            <input
              type="text"
              placeholder="새 프리셋 이름..."
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] focus:outline-none"
            />
            <button
              onClick={handleCreatePreset}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] px-2 rounded"
            >
              저장
            </button>
          </div>
        </div>

        {/* Endpoint List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {endpoints.map((ep) => {
            const isSelected = ep.id === selectedId
            const methodColors: Record<string, string> = {
              GET: 'text-green-400 bg-green-950/50 border-green-800',
              POST: 'text-blue-400 bg-blue-950/50 border-blue-800',
              PUT: 'text-amber-400 bg-amber-950/50 border-amber-800',
              DELETE: 'text-red-400 bg-red-950/50 border-red-800',
            }

            return (
              <div
                key={ep.id}
                onClick={() => selectEndpoint(ep.id)}
                className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                  isSelected
                    ? 'border-indigo-500 bg-slate-800/80'
                    : 'border-slate-800/60 bg-slate-900/40 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      methodColors[ep.method]
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="text-sm font-mono truncate text-slate-200">
                    {ep.path}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={ep.enabled}
                  onChange={(e) => {
                    e.stopPropagation()
                    toggleEndpoint(ep.id)
                  }}
                  className="accent-indigo-500 cursor-pointer"
                />
              </div>
            )
          })}
        </div>
      </aside>

      {/* Main View */}
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
                title="테스트 요청 시 함께 보낼 Query String 및 Request Body 설정"
              >
                <SlidersHorizontal size={13} />
                <span>테스트 파라미터</span>
              </button>

              <button
                onClick={handleCopyFetch}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs px-2.5 py-2 rounded transition cursor-pointer"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? '복사됨' : 'fetch 복사'}</span>
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
                className="p-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 rounded transition"
                title="엔드포인트 삭제"
              >
                <Trash2 size={15} />
              </button>
            </header>

            {/* 💡 [Phase 2] 테스트 요청용 Query & Request Body 입력 패널 */}
            {showTestConfig && (
              <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                  <span className="text-slate-400 font-semibold whitespace-nowrap">Query String (?):</span>
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="예: role=admin&page=2"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 font-mono text-indigo-300 focus:outline-none"
                  />
                </div>
                {(selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT') && (
                  <div className="flex items-center gap-2 flex-[2] min-w-[280px]">
                    <span className="text-slate-400 font-semibold whitespace-nowrap">Request Body (JSON):</span>
                    <input
                      type="text"
                      value={testBody}
                      onChange={(e) => setTestBody(e.target.value)}
                      placeholder='예: {"username": "dev"}'
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 font-mono text-emerald-300 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 💡 [Phase 2] 동적 템플릿 & Mini-Faker 칩 바 */}
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

            {/* Inspector Panel */}
            <div className="flex-[2] border-t border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Terminal size={14} className="text-indigo-400" />
                  실시간 네트워크 트래픽 로그 (클릭하여 응답 상세 보기)
                </div>
                <button onClick={clearLogs} className="text-[11px] text-slate-400 hover:text-white transition">
                  로그 비우기
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
                {logs.length === 0 ? (
                  <div className="p-2 text-slate-600 italic">
                    가로챈 요청이 없습니다. 상단의 초록색 [Send] 버튼을 눌러 테스트해 보세요!
                  </div>
                ) : (
                  logs.map((log) => {
                    const isExpanded = expandedLogId === log.id
                    const isError = log.status >= 400

                    return (
                      <div key={log.id} className="border border-slate-800/80 rounded bg-slate-900/40 overflow-hidden">
                        <div
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-800/50 transition"
                        >
                          <div className="flex items-center gap-2.5 flex-wrap">
                            {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                            <span className="text-slate-500">{log.timestamp}</span>
                            <span className="font-bold text-indigo-400">{log.method}</span>
                            <span className="text-slate-200">{log.path}</span>
                            {log.matchedParams && Object.keys(log.matchedParams).length > 0 && (
                              <span className="text-amber-400 text-[11px] bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/50">
                                Params: {JSON.stringify(log.matchedParams)}
                              </span>
                            )}
                            {log.matchedQuery && (
                              <span className="text-sky-400 text-[11px] bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-900/50">
                                Query: {JSON.stringify(log.matchedQuery)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-[11px]">{log.duration}ms</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] border ${
                                isError
                                  ? 'bg-red-950 text-red-400 border-red-800'
                                  : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 text-slate-300 space-y-2">
                            {log.requestBody && (
                              <div>
                                <div className="text-[10px] text-slate-500 mb-0.5 uppercase tracking-wider font-semibold">
                                  Request Body
                                </div>
                                <pre className="text-xs text-amber-300 overflow-x-auto whitespace-pre-wrap">
                                  {log.requestBody}
                                </pre>
                              </div>
                            )}
                            <div>
                              <div className="text-[10px] text-slate-500 mb-0.5 uppercase tracking-wider font-semibold">
                                Response Body
                              </div>
                              <pre className="text-xs text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                                {log.responseBody}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            엔드포인트를 선택하거나 신규 작성해 주세요.
          </div>
        )}
      </main>
    </div>
  )
}