import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MockEndpoint {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  status: number
  responseBody: string
  delay: number
  enabled: boolean
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
}

export interface Preset {
  id: string
  name: string
  endpoints: MockEndpoint[]
}

interface MockState {
  endpoints: MockEndpoint[]
  selectedId: string | null
  logs: NetworkLog[]
  presets: Preset[]
  activePresetId: string | null

  selectEndpoint: (id: string) => void
  addEndpoint: () => void
  updateEndpoint: (id: string, updated: Partial<MockEndpoint>) => void
  deleteEndpoint: (id: string) => void
  toggleEndpoint: (id: string) => void
  addLog: (log: Omit<NetworkLog, 'id' | 'timestamp'>) => void
  clearLogs: () => void
  importEndpoints: (data: MockEndpoint[]) => void
  saveCurrentAsPreset: (name: string) => void
  loadPreset: (presetId: string) => void
  deletePreset: (presetId: string) => void
  importSwaggerSpec: (swaggerJson: any) => void
}

const DEFAULT_ENDPOINTS: MockEndpoint[] = [
  {
    id: '1',
    method: 'GET',
    path: '/api/users/:id',
    status: 200,
    responseBody: JSON.stringify({ id: '{{params.id}}', name: 'John Doe', role: 'Developer' }, null, 2),
    delay: 0,
    enabled: true,
  },
  {
    id: '2',
    method: 'POST',
    path: '/api/login',
    status: 200,
    responseBody: JSON.stringify({ token: 'mock-jwt-token-xyz' }, null, 2),
    delay: 300,
    enabled: true,
  },
]

export const useMockStore = create<MockState>()(
  persist(
    (set, get) => ({
      endpoints: DEFAULT_ENDPOINTS,
      selectedId: '1',
      logs: [],
      presets: [
        {
          id: 'default-happy',
          name: '🟢 정상 동작 시나리오 (Happy Path)',
          endpoints: DEFAULT_ENDPOINTS,
        },
        {
          id: 'default-error',
          name: '🔴 전체 서버 장애 시나리오 (500 Error)',
          endpoints: DEFAULT_ENDPOINTS.map((ep) => ({
            ...ep,
            status: 500,
            responseBody: JSON.stringify({ error: 'Internal Server Error', code: 500 }, null, 2),
          })),
        },
      ],
      activePresetId: 'default-happy',

      selectEndpoint: (id) => set({ selectedId: id }),

      addEndpoint: () => {
        const newEp: MockEndpoint = {
          id: Date.now().toString(),
          method: 'GET',
          path: `/api/resource/${Date.now().toString().slice(-4)}`,
          status: 200,
          responseBody: JSON.stringify({ message: 'Success' }, null, 2),
          delay: 0,
          enabled: true,
        }
        set((state) => ({
          endpoints: [newEp, ...state.endpoints],
          selectedId: newEp.id,
        }))
      },

      updateEndpoint: (id, updated) =>
        set((state) => ({
          endpoints: state.endpoints.map((ep) =>
            ep.id === id ? { ...ep, ...updated } : ep
          ),
        })),

      deleteEndpoint: (id) =>
        set((state) => {
          const nextEndpoints = state.endpoints.filter((ep) => ep.id !== id)
          return {
            endpoints: nextEndpoints,
            selectedId: state.selectedId === id ? nextEndpoints[0]?.id || null : state.selectedId,
          }
        }),

      toggleEndpoint: (id) =>
        set((state) => ({
          endpoints: state.endpoints.map((ep) =>
            ep.id === id ? { ...ep, enabled: !ep.enabled } : ep
          ),
        })),

      addLog: (log) =>
        set((state) => ({
          logs: [
            {
              id: Math.random().toString(36).substring(2, 9),
              timestamp: new Date().toLocaleTimeString(),
              ...log,
            },
            ...state.logs.slice(0, 49),
          ],
        })),

      clearLogs: () => set({ logs: [] }),

      importEndpoints: (data) => set({ endpoints: data, selectedId: data[0]?.id || null }),

      saveCurrentAsPreset: (name) =>
        set((state) => {
          const newPreset: Preset = {
            id: Date.now().toString(),
            name,
            endpoints: JSON.parse(JSON.stringify(state.endpoints)),
          }
          return {
            presets: [...state.presets, newPreset],
            activePresetId: newPreset.id,
          }
        }),

      loadPreset: (presetId) => {
        const preset = get().presets.find((p) => p.id === presetId)
        if (preset) {
          set({
            endpoints: JSON.parse(JSON.stringify(preset.endpoints)),
            selectedId: preset.endpoints[0]?.id || null,
            activePresetId: presetId,
          })
        }
      },

      deletePreset: (presetId) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== presetId),
          activePresetId: state.activePresetId === presetId ? null : state.activePresetId,
        })),

      importSwaggerSpec: (swaggerJson) => {
        try {
          const importedEndpoints: MockEndpoint[] = []
          const paths = swaggerJson.paths || {}

          Object.keys(paths).forEach((pathKey) => {
            const methods = paths[pathKey]
            Object.keys(methods).forEach((methodKey) => {
              const upperMethod = methodKey.toUpperCase() as MockEndpoint['method']
              if (['GET', 'POST', 'PUT', 'DELETE'].includes(upperMethod)) {
                const formattedPath = pathKey.replace(/\{([^}]+)\}/g, ':$1')
                importedEndpoints.push({
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                  method: upperMethod,
                  path: formattedPath,
                  status: 200,
                  responseBody: JSON.stringify(
                    {
                      message: `Swagger auto-generated response for ${upperMethod} ${formattedPath}`,
                      timestamp: new Date().toISOString(),
                    },
                    null,
                    2
                  ),
                  delay: 0,
                  enabled: true,
                })
              }
            })
          })

          if (importedEndpoints.length > 0) {
            set({
              endpoints: importedEndpoints,
              selectedId: importedEndpoints[0].id,
            })
            alert(`Swagger 파싱 성공: 총 ${importedEndpoints.length}개의 엔드포인트가 생성되었습니다!`)
          } else {
            alert('유효한 OpenAPI/Swagger Path를 찾을 수 없습니다.')
          }
        } catch {
          alert('Swagger JSON 파싱 중 오류가 발생했습니다.')
        }
      },
    }),
    {
      name: 'mocklab-v2-storage',
    }
  )
)