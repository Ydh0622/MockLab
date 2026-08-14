import React, { useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Plus, Trash2, Download, Upload, Terminal, Clock, Layers, FileCode } from 'lucide-react'
import { useMockStore } from './store/useMockStore'

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
    deletePreset,
    importSwaggerSpec,
  } = useMockStore()

  const jsonFileInputRef = useRef<HTMLInputElement>(null)
  const swaggerFileInputRef = useRef<HTMLInputElement>(null)
  const [newPresetName, setNewPresetName] = useState('')

  const selectedEndpoint = endpoints.find((ep) => ep.id === selectedId)

  // Export JSON
  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(endpoints, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `mocklab-export-${Date.now()}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  // Import JSON
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

  // Import Swagger JSON
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
          <h1 className="text-xl font-bold tracking-wide text-indigo-400">MockLab v2</h1>
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

        {/* 🎭 시나리오/프리셋 선택 바 */}
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
            <header className="p-4 border-b border-slate-800 flex flex-wrap items-center gap-3 bg-slate-950/50">
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
                className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono focus:outline-none"
              />

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Status:</span>
                <input
                  type="number"
                  value={selectedEndpoint.status}
                  onChange={(e) =>
                    updateEndpoint(selectedEndpoint.id, {
                      status: Number(e.target.value),
                    })
                  }
                  className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm font-mono focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400">Delay(ms):</span>
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
                  className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm font-mono focus:outline-none"
                />
              </div>

              <button
                onClick={() => deleteEndpoint(selectedEndpoint.id)}
                className="p-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 rounded transition"
                title="엔드포인트 삭제"
              >
                <Trash2 size={16} />
              </button>
            </header>

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
                  실시간 네트워크 트래픽 로그 (Inspector)
                </div>
                <button onClick={clearLogs} className="text-[11px] text-slate-400 hover:text-white transition">
                  로그 비우기
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1">
                {logs.length === 0 ? (
                  <div className="text-slate-600 italic">가로챈 요청이 없습니다.</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 text-slate-300">
                      <span className="text-slate-500">{log.timestamp}</span>
                      <span className="font-bold text-indigo-400">{log.method}</span>
                      <span className="text-slate-200">{log.path}</span>
                      {log.matchedParams && Object.keys(log.matchedParams).length > 0 && (
                        <span className="text-amber-400 text-[11px]">
                          Params: {JSON.stringify(log.matchedParams)}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {log.status} OK
                      </span>
                    </div>
                  ))
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