import React from 'react'
import Editor from '@monaco-editor/react'
import { Plus, Play, CheckCircle2, XCircle } from 'lucide-react'
import { useMockStore } from './store/useMockStore'

export default function App() {
  const {
    endpoints,
    selectedId,
    selectEndpoint,
    addEndpoint,
    updateEndpoint,
    toggleEndpoint,
  } = useMockStore()

  const selectedEndpoint = endpoints.find((ep) => ep.id === selectedId)

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-950">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-wide text-indigo-400">MockLab</h1>
          <button
            onClick={addEndpoint}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-2.5 py-1.5 rounded transition cursor-pointer"
          >
            <Plus size={14} /> 엔드포인트 추가
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
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

      {/* Main Editor View */}
      <main className="flex-1 flex flex-col bg-slate-900">
        {selectedEndpoint ? (
          <>
            {/* Top Toolbar */}
            <header className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/50">
              <select
                value={selectedEndpoint.method}
                onChange={(e) =>
                  updateEndpoint(selectedEndpoint.id, {
                    method: e.target.value as any,
                  })
                }
                className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-semibold text-indigo-300 focus:outline-none focus:border-indigo-500"
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
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-indigo-500"
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
                  className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </header>

            {/* Monaco Editor Section */}
            <div className="flex-1 p-2 relative">
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
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            엔드포인트를 선택하거나 신규 작성해 주세요.
          </div>
        )}
      </main>
    </div>
  )
}