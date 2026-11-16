import { MockEndpoint } from '../types/mock'
import { useMockStore } from '../store/useMockStore'

// 인메모리 가상 DB 컬렉션에 대한 조회, 생성, 수정, 삭제 처리
export function executeStatefulCrud(
  ep: MockEndpoint,
  params: Record<string, any>,
  queryObj: Record<string, string>,
  reqBodyObj: Record<string, any>
): { status: number; body: any; actionLabel: string } {
  const colName = (ep.collectionName || 'users').trim()
  const store = useMockStore.getState()
  const list = [...(store.collections[colName] || [])]
  const targetId = params.id !== undefined ? String(params.id) : undefined

  if (ep.method === 'GET') {
    if (targetId) {
      const found = list.find((item) => String(item.id) === targetId)
      if (!found) {
        return {
          status: 404,
          body: { error: 'Not Found', message: `ID '${targetId}' 항목을 ${colName}에서 찾을 수 없습니다.` },
          actionLabel: `DB 단건 조회 실패 (${colName}#${targetId})`,
        }
      }
      return {
        status: 200,
        body: found,
        actionLabel: `DB 단건 조회 (${colName}#${targetId})`,
      }
    }

    const filtered = list.filter((item) =>
      Object.entries(queryObj).every(([k, v]) => String(item[k]) === String(v))
    )
    return {
      status: 200,
      body: filtered,
      actionLabel: `DB 목록 조회 (${colName}: ${filtered.length}건)`,
    }
  }

  if (ep.method === 'POST') {
    const newItem = {
      id: reqBodyObj.id ? String(reqBodyObj.id) : String(Date.now()).slice(-4),
      ...reqBodyObj,
      createdAt: new Date().toISOString(),
    }
    store.setCollectionData(colName, [...list, newItem])
    return {
      status: 201,
      body: newItem,
      actionLabel: `DB 항목 생성 (${colName}#${newItem.id})`,
    }
  }

  if (ep.method === 'PUT') {
    const idToUpdate = targetId || (reqBodyObj.id ? String(reqBodyObj.id) : '')
    const index = list.findIndex((item) => String(item.id) === idToUpdate)
    if (index === -1) {
      return {
        status: 404,
        body: { error: 'Not Found', message: `수정할 ID '${idToUpdate}' 항목이 없습니다.` },
        actionLabel: `DB 수정 실패 (${colName}#${idToUpdate})`,
      }
    }
    const updatedItem = { ...list[index], ...reqBodyObj, updatedAt: new Date().toISOString() }
    list[index] = updatedItem
    store.setCollectionData(colName, list)
    return {
      status: 200,
      body: updatedItem,
      actionLabel: `DB 항목 수정 (${colName}#${idToUpdate})`,
    }
  }

  if (ep.method === 'DELETE') {
    const idToDelete = targetId || queryObj.id || ''
    const nextList = list.filter((item) => String(item.id) !== String(idToDelete))
    if (nextList.length === list.length) {
      return {
        status: 404,
        body: { error: 'Not Found', message: `삭제할 ID '${idToDelete}' 항목이 없습니다.` },
        actionLabel: `DB 삭제 실패 (${colName}#${idToDelete})`,
      }
    }
    store.setCollectionData(colName, nextList)
    return {
      status: 200,
      body: { deletedId: idToDelete, message: '정상적으로 삭제되었습니다.' },
      actionLabel: `DB 항목 삭제 (${colName}#${idToDelete})`,
    }
  }

  return { status: ep.status, body: {}, actionLabel: 'DB 작업 없음' }
}