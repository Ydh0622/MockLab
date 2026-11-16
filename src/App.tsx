import React, { useRef, useState, useEffect } from 'react'
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
  ShieldAlert,
  Flame,
  Search,
  Share2,
  GitBranch,
} from 'lucide-react'
import { useMockStore, HeaderItem, ResponseRule } from './store/useMockStore'

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
  const [shareCopied, setShareCopied] = useState(false)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  // 사이드바 경로 검색 및 HTTP 메서드 필터 상태
  const [searchTerm, setSearchTerm] = useState('')
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE'>('ALL')

  // 인앱 테스트 발송용 파라미터 상태
  const [showTestConfig, setShowTestConfig] = useState(false)
  const [testQuery, setTestQuery] = useState('role=admin')
  const [testBody, setTestBody] = useState('{"username": "frontend_master"}')
  const [includeTestAuth, setIncludeTestAuth] = useState(true)
  const [testToken, setTestToken] = useState('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')

  // 메인 편집 영역 탭 전환 상태
  const [activeTab, setActiveTab] = useState<'body' | 'rules' | 'headers'>('body')

  // URL 쿼리에 공유 데이터(?share=...)가 있을 경우 파싱하여 스토어에 반영
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

  // 검색어 및 메서드 조건에 따른 엔드포인트 필터링
  const filteredEndpoints = endpoints.filter((ep) => {
    const matchesSearch = ep.path.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMethod = methodFilter === 'ALL' || ep.method === methodFilter
    return matchesSearch && matchesMethod
  })

  const getTestablePath = (path: string) => {
    const basePath = path.replace(/:([a-zA-Z0-9_]+)/g, '1')
    const cleanQuery = testQuery.trim().replace(/^\?/, '')
    return cleanQuery ? `${basePath}?${cleanQuery}` : basePath
  }

  const handleSendRequest = async () => {
    if (!selectedEndpoint) return
    if (!selectedEndpoint.enabled) {
      alert('비활성화된 엔드포인트입니다. 좌측 체크박스를 먼저 켜주세요.')
      return
    }

    setIsSending(true)
    const testUrl = getTestablePath(selectedEndpoint.path)
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

  const handleCopyFetch = () => {
    if (!selectedEndpoint) return
    const testUrl = getTestablePath(selectedEndpoint.path)
    const hasBody = selectedEndpoint.method === 'POST' || selectedEndpoint.method === 'PUT'

    const headersObj: Record<string, string> = {}
    if (hasBody) headersObj['Content-Type'] = 'application/json'
    if (selectedEndpoint.requireAuth || includeTestAuth) {
      headersObj['Authorization'] = testToken.trim()
    }

    const hasHeaders = Object.keys(headersObj).length > 0
    const optionsParts = [`method: '${selectedEndpoint.method}'`]
    if (hasHeaders) optionsParts.push(`headers: ${JSON.stringify(headersObj)}`)
    if (hasBody) optionsParts.push(`body: '${testBody}'`)

    const fetchCode = `fetch('${testUrl}', { ${optionsParts.join(', ')} })\n  .then(res => res.json())\n  .then(console.log);`
    navigator.clipboard.writeText(fetchCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // 전체 엔드포인트 설정을 Base64 인코딩하여 공유 URL 생성
  const handleShareUrl = () => {
    try {
      const jsonStr = JSON.stringify(endpoints)
      const encoded = btoa(unescape(encodeURIComponent(jsonStr)))
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${encoded}`
      navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      alert('공유 링크 생성 중 오류가 발생했습니다.')
    }
  }

  const handleInsertToken = (token: string) => {
    navigator.clipboard.writeText(token)
    alert(`클립보드에 ${token} 복사 완료. 에디터 원하는 위치에 붙여넣기(Ctrl+V) 하세요.`)
  }

  // 응답 헤더 추가/수정/삭제 핸들러
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

  // 조건부 응답 규칙 추가/수정/삭제 핸들러
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
      {/* 좌측 사이드바 */}
      <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-950">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-wide text-indigo-400">MockLab v2.4</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={handleShareUrl}
              title="URL 링크로 전체 Mock 설정 공유"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-indigo-300 transition cursor-pointer"
            >
              {shareCopied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            </button>
            <button
              onClick={handleExport}
              title="설정 내보내기 (JSON)"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition cursor-pointer"
            >
              <Download size={14} />
            </button>
            <button
              onClick={() => jsonFileInputRef.current?.click()}
              title="설정 가져오기 (JSON)"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition cursor-pointer"
            >
              <Upload size={14} />
            </button>
            <button
              onClick={() => swaggerFileInputRef.current?.click()}
              title="Swagger/OpenAPI 자동 파싱"
              className="p-1.5 bg-indigo-950 border border-indigo-700 hover:bg-indigo-900 rounded text-indigo-300 transition cursor-pointer"
            >
              <FileCode size={14} />
            </button>
            <input type="file" ref={jsonFileInputRef} onChange={handleImportJson} accept=".json" className="hidden" />
            <input type="file" ref={swaggerFileInputRef} onChange={handleImportSwagger} accept=".json" className="hidden" />

            <button
              onClick={addEndpoint}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-2 py-1.5 rounded transition font-medium ml-1 cursor-pointer"
            >
              <Plus size={14} /> 추가
            </button>
          </div>
        </div>

        {/* 시나리오 프리셋 영역 */}
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
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] px-2 rounded cursor-pointer"
            >
              저장
            </button>
          </div>
        </div>

        {/* 경로 검색 및 메서드 필터 영역 */}
        <div className="p-2.5 border-b border-slate-800/80 bg-slate-950 space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              placeholder="API 경로 검색 (예: /users)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-1">
            {(['ALL', 'GET', 'POST', 'PUT', 'DELETE'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`flex-1 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                  methodFilter === m
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* 엔드포인트 목록 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredEndpoints.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-600">
              일치하는 엔드포인트가 없습니다.
            </div>
          ) : (
            filteredEndpoints.map((ep) => {
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
                  <div className="flex items-center gap-1.5">
                    {(ep.rules || []).length > 0 && (
                      <span title={`다중 응답 규칙 ${(ep.rules || []).length}개`} className="text-sky-400">
                        <GitBranch size={13} />
                      </span>
                    )}
                    {ep.requireAuth && (
                      <span title="Auth 토큰 필수" className="text-amber-400">
                        <ShieldAlert size={13} />
                      </span>
                    )}
                    {(ep.failureRate || 0) > 0 && (
                      <span title={`Chaos 장애율 ${ep.failureRate}%`} className="text-rose-400">
                        <Flame size={13} />
                      </span>
                    )}
                    <input
                      type="checkbox"
                      checked={ep.enabled}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleEndpoint(ep.id)
                      }}
                      className="accent-indigo-500 cursor-pointer ml-1"
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* 우측 메인 편집 및 로그 영역 */}
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
                onClick={handleCopyFetch}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs px-2.5 py-2 rounded transition cursor-pointer"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? '복사됨' : 'fetch 복사'}</span>
              </button>

              <div className="h-4 w-[1px] bg-slate-800 mx-1" />

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Default Status:</span>
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

            {/* 예외 시뮬레이션 설정 및 탭 전환 바 */}
            <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedEndpoint.requireAuth)}
                    onChange={(e) =>
                      updateEndpoint(selectedEndpoint.id, { requireAuth: e.target.checked })
                    }
                    className="accent-amber-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1 font-medium text-amber-300">
                    <ShieldAlert size={14} /> Auth 토큰 가드 (401)
                  </span>
                </label>

                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1 font-medium text-rose-400">
                    <Flame size={14} /> Chaos 장애 확률:
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
                    className="w-24 accent-rose-500 cursor-pointer"
                  />
                  <span className="font-mono text-rose-300 w-8">
                    {selectedEndpoint.failureRate || 0}%
                  </span>
                </div>
              </div>

              {/* 편집기 탭 전환 버튼 */}
              <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveTab('body')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    activeTab === 'body'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Default Body
                </button>
                <button
                  onClick={() => setActiveTab('rules')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
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
                  className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    activeTab === 'headers'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Headers ({(selectedEndpoint.headers || []).length})
                </button>
              </div>
            </div>

            {/* 인앱 테스트 파라미터 입력 영역 */}
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

            {/* 기본 Response Body 편집 탭 */}
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

            {/* 다중 조건부 응답 규칙(Rules) 편집 탭 */}
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

            {/* 커스텀 Response Headers 편집 탭 */}
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

            {/* 하단 실시간 트래픽 로그 패널 */}
            <div className="flex-[2] border-t border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Terminal size={14} className="text-indigo-400" />
                  실시간 네트워크 트래픽 로그 (클릭하여 응답 상세 보기)
                </div>
                <button onClick={clearLogs} className="text-[11px] text-slate-400 hover:text-white transition cursor-pointer">
                  로그 비우기
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
                {logs.length === 0 ? (
                  <div className="p-2 text-slate-600 italic">
                    가로챈 요청이 없습니다. 상단의 초록색 [Send] 버튼을 눌러 테스트해 보세요.
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

                            {log.matchedRuleName && (
                              <span className="text-sky-300 text-[10px] bg-sky-950/70 px-1.5 py-0.5 rounded border border-sky-700 font-semibold">
                                규칙: {log.matchedRuleName}
                              </span>
                            )}
                            {log.errorReason === 'AUTH_GUARD' && (
                              <span className="text-amber-300 text-[10px] bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-700 font-semibold">
                                Auth Guard 차단
                              </span>
                            )}
                            {log.errorReason === 'CHAOS_MODE' && (
                              <span className="text-rose-300 text-[10px] bg-rose-950/70 px-1.5 py-0.5 rounded border border-rose-700 font-semibold">
                                Chaos 장애 발생
                              </span>
                            )}
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
                          <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 text-slate-300 space-y-2.5">
                            {log.responseHeaders && Object.keys(log.responseHeaders).length > 0 && (
                              <div>
                                <div className="text-[10px] text-slate-500 mb-0.5 uppercase tracking-wider font-semibold">
                                  Response Headers
                                </div>
                                <pre className="text-xs text-indigo-300 overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(log.responseHeaders, null, 2)}
                                </pre>
                              </div>
                            )}
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