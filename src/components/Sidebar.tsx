import React, { useRef, useState } from 'react'
import {
  Plus,
  Download,
  Upload,
  Layers,
  FileCode,
  ShieldAlert,
  Flame,
  Search,
  Share2,
  GitBranch,
  Database,
  Check,
} from 'lucide-react'
import { useMockStore } from '../store/useMockStore'

export function Sidebar() {
  const {
    endpoints,
    selectedId,
    presets,
    activePresetId,
    selectEndpoint,
    addEndpoint,
    toggleEndpoint,
    importEndpoints,
    saveCurrentAsPreset,
    loadPreset,
    importSwaggerSpec,
  } = useMockStore()

  const jsonFileInputRef = useRef<HTMLInputElement>(null)
  const swaggerFileInputRef = useRef<HTMLInputElement>(null)
  const [newPresetName, setNewPresetName] = useState('')
  const [shareCopied, setShareCopied] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE'>('ALL')

  const filteredEndpoints = endpoints.filter((ep) => {
    const matchesSearch = ep.path.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMethod = methodFilter === 'ALL' || ep.method === methodFilter
    return matchesSearch && matchesMethod
  })

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
    <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-950">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-wide text-indigo-400">MockLab v3.0</h1>
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
                  {ep.useStatefulDb && (
                    <span title={`Stateful DB 연동 (${ep.collectionName || 'users'})`} className="text-emerald-400">
                      <Database size={13} />
                    </span>
                  )}
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
  )
}