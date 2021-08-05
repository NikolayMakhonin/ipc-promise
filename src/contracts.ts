export type TIpcPromiseType = 'IpcPromise-2e07c32b-b7df-474f-89f7-dab809382670'
export const EVENT_TYPE_IPC_PROMISE: TIpcPromiseType = 'IpcPromise-2e07c32b-b7df-474f-89f7-dab809382670'

export type TIpcPromiseAction = 'create' | 'resolve' | 'reject'

export type TIpcPromiseEvent = {
  type: TIpcPromiseType,
  id: string,
  action: TIpcPromiseAction,
  value?: any,
}

export type TSubscribe = {
  [key in 'on' | 'addListener']: (event: string | symbol, listener: (...args: any[]) => void) => any;
} & {
  [key in 'off' | 'removeListener']: (event: string | symbol, listener: (...args: any[]) => void) => any;
}

export type TSend = {
  send(
    message: any,
    sendHandle?: any,
    options?: { [key in string]: any },
    callback?: (error: Error | null) => void,
  ): any;
} | {
  emit(event: string | symbol, ...args: any[]): boolean;
}

export type TEventEmitter = TSubscribe & TSend
