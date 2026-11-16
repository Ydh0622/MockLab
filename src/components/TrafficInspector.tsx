import { useState } from 'react'
import { Terminal, ChevronDown, ChevronRight } from 'lucide-react'
import { useMockStore } from '../store/useMockStore'

export function TrafficInspector() {
  const { logs, clearLogs } = useMockStore()
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  const totalRequests = logs.length
  const successCount = logs.filter((l) => l.status >= 200 && l.status < 400).length
  const successRate = totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 100
  const avgDuration =
    totalRequests > 0
      ? Math.round(logs.reduce((acc, cur) => acc + cur.duration, 0) / totalRequests)
      : 0

  return (
    <div className="flex-[2] border-t border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-900/60">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Terminal size={14} className="text-indigo-400" />
            실시간 트래픽 로그
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono border-l border-slate-800 pl-3">
            <span className="text-slate-400">
              총 요청: <b className="text-slate-200">{totalRequests}</b>
            </span>
            <span className="text-slate-400">
              성공률: <b className="text-emerald-400">{successRate}%</b>
            </span>
            <span className="text-slate-400">
              평균 지연: <b className="text-indigo-300">{avgDuration}ms</b>
            </span>
          </div>
        </div>
        <button
          onClick={clearLogs}
          className="text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
        >
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
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={14} className="text-slate-400" />
                    )}
                    <span className="text-slate-500">{log.timestamp}</span>
                    <span className="font-bold text-indigo-400">{log.method}</span>
                    <span className="text-slate-200">{log.path}</span>

                    {log.statefulAction && (
                      <span className="text-emerald-300 text-[10px] bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-700 font-semibold">
                        {log.statefulAction}
                      </span>
                    )}
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
  )
}