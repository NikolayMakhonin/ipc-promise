import {Serializable} from 'child_process'
import {
  TSubscribe,
  TSend,
  EVENT_TYPE_IPC_PROMISE,
  TIpcPromiseEvent,
  TIpcPromiseAction,
  TEventEmitter,
} from './contracts'

// region types

// endregion

// region helpers

function on(proc: TSubscribe, event: string | symbol, listener: (...args: any[]) => void) {
  const _on = proc.addListener || proc.on
  _on.call(proc, 'message', listener)
}

function off(proc: TSubscribe, event: string | symbol, listener: (...args: any[]) => void) {
  const _off = proc.removeListener || proc.off
  _off.call(proc, 'message', listener)
}

function send(proc: TSend, message: Serializable) {
  return new Promise<void>((resolve, reject) => {
    if ('send' in proc) {
      proc.send(message, null, {}, (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve(void 0)
      })
    } else {
      proc.emit('message', message)
      resolve(void 0)
    }
  })
}

function sendIpcPromiseEvent(proc: TSend, promiseId: string, action: TIpcPromiseAction, value?: Serializable) {
  return send(proc, {
    type: EVENT_TYPE_IPC_PROMISE,
    id  : promiseId,
    action,
    value,
  } as TIpcPromiseEvent)
}

// endregion

// region actions

export function createIpcPromise(proc: TEventEmitter, promiseId: string) {
  return new Promise<void>((resolve, reject) => {
    const listener = (event: TIpcPromiseEvent) => {
      if (
        event
        && event.type === EVENT_TYPE_IPC_PROMISE
        && event.id === promiseId
      ) {
        off(proc, 'message', listener)
        if (event.action === 'reject') {
          reject(event.value)
        } else if (event.action === 'resolve') {
          resolve(event.value)
        } else {
          console.error('Unknown event.action: ' + event.action)
        }
      }
    }
    on(proc, 'message', listener)
    sendIpcPromiseEvent(proc, promiseId, 'create')
      .catch(err => {
        off(proc, 'message', listener)
        reject(err)
      })
  })
}

export function resolveIpcPromise(proc: TSend, promiseId: string, value: any) {
  return sendIpcPromiseEvent(proc, promiseId, 'resolve', value)
}

export function rejectIpcPromise(proc: TSend, promiseId: string, error: any) {
  return sendIpcPromiseEvent(proc, promiseId, 'reject', error)
}

// endregion
