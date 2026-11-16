import { useState } from 'react'
import { Code2, Check, Copy, X } from 'lucide-react'
import { MockEndpoint, SnippetFormat } from '../types/mock'
import { generateClientSnippet } from '../utils/codeGenerator'

interface CodeSnippetModalProps {
  endpoint: MockEndpoint
  testQuery: string
  testBody: string
  includeTestAuth: boolean
  testToken: string
  onClose: () => void
}

export function CodeSnippetModal({
  endpoint,
  testQuery,
  testBody,
  includeTestAuth,
  testToken,
  onClose,
}: CodeSnippetModalProps) {
  const [snippetFormat, setSnippetFormat] = useState<SnippetFormat>('fetch')
  const [copied, setCopied] = useState(false)

  const code = generateClientSnippet(
    endpoint,
    snippetFormat,
    testQuery,
    testBody,
    includeTestAuth,
    testToken
  )

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Code2 size={16} className="text-indigo-400" />
            클라이언트 호출 코드 생성기 ({endpoint.method} {endpoint.path})
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(
                [
                  { id: 'fetch', label: 'Fetch API' },
                  { id: 'axios', label: 'Axios' },
                  { id: 'curl', label: 'cURL' },
                  { id: 'rq', label: 'TanStack Query' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSnippetFormat(tab.id)}
                  className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
                    snippetFormat === tab.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition cursor-pointer"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? '복사 완료' : '코드 복사'}
            </button>
          </div>

          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {code}
          </pre>
        </div>
      </div>
    </div>
  )
}