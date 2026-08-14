import { create } from 'zustand'

export interface MockEndpoint {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  status: number
  responseBody: string
  enabled: boolean
}

interface MockStore {
  endpoints: MockEndpoint[]
  selectedId: string | null
  selectEndpoint: (id: string) => void
  addEndpoint: () => void
  updateEndpoint: (id: string, updated: Partial<MockEndpoint>) => void
  toggleEndpoint: (id: string) => void
}

export const useMockStore = create<MockStore>((set) => ({
  endpoints: [
    {
      id: '1',
      method: 'GET',
      path: '/api/users',
      status: 200,
      responseBody: JSON.stringify([{ id: 1, name: 'John Doe' }], null, 2),
      enabled: true,
    },
    {
      id: '2',
      method: 'POST',
      path: '/api/login',
      status: 200,
      responseBody: JSON.stringify({ token: 'mock-jwt-token' }, null, 2),
      enabled: true,
    },
  ],
  selectedId: '1',
  selectEndpoint: (id) => set({ selectedId: id }),
  addEndpoint: () =>
    set((state) => {
      const newId = String(Date.now())
      const newEndpoint: MockEndpoint = {
        id: newId,
        method: 'GET',
        path: '/api/new-endpoint',
        status: 200,
        responseBody: '{\n  "message": "Hello World"\n}',
        enabled: true,
      }
      return {
        endpoints: [...state.endpoints, newEndpoint],
        selectedId: newId,
      }
    }),
  updateEndpoint: (id, updated) =>
    set((state) => ({
      endpoints: state.endpoints.map((ep) =>
        ep.id === id ? { ...ep, ...updated } : ep
      ),
    })),
  toggleEndpoint: (id) =>
    set((state) => ({
      endpoints: state.endpoints.map((ep) =>
        ep.id === id ? { ...ep, enabled: !ep.enabled } : ep
      ),
    })),
}))