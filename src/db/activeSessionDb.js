import { dbPromise } from './index.js'

export async function getActiveSession() {
  return (await dbPromise).get('activeSession', 1)
}

export async function putActiveSession(session) {
  return (await dbPromise).put('activeSession', session)
}

export async function clearActiveSession() {
  return (await dbPromise).delete('activeSession', 1)
}
