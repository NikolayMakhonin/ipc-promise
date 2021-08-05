import {Serializable} from 'child_process'
import {
	TSend,
	TSubscribeSend,
} from './contracts'
import {off, once, send} from './helpers'

type TIpcPromiseType = 'ipcPromise-2e07c32b-b7df-474f-89f7-dab809382670'
const EVENT_TYPE_IPC_PROMISE: TIpcPromiseType = 'ipcPromise-2e07c32b-b7df-474f-89f7-dab809382670'

type TIpcPromiseAction = 'create' | 'resolve' | 'reject'

type TIpcPromiseEvent = {
	type: TIpcPromiseType,
	id: string,
	action: TIpcPromiseAction,
	value?: any,
}

function sendIpcPromiseEvent(proc: TSend, promiseId: string, action: TIpcPromiseAction, value: Serializable) {
	return send(proc, {
		type: EVENT_TYPE_IPC_PROMISE,
		id  : promiseId,
		action,
		value,
	} as TIpcPromiseEvent)
}

export function ipcPromiseCreate(proc: TSubscribeSend, promiseId: string, arg: any) {
	return new Promise<void>((resolve, reject) => {
		const listener = (event: TIpcPromiseEvent) => {
			if (event.action === 'resolve') {
				resolve(event.value)
			} else {
				reject(event.value)
			}
		}

		once(proc, 'message', listener, event => {
			return event
				&& event.type === EVENT_TYPE_IPC_PROMISE
				&& event.id === promiseId
				&& (event.action === 'resolve' || event.action === 'reject')
		})

		sendIpcPromiseEvent(proc, promiseId, 'create', arg)
			.catch(err => {
				off(proc, 'message', listener)
				reject(err)
			})
	})
}

export function ipcPromiseResolve(proc: TSend, promiseId: string, value: any) {
	return sendIpcPromiseEvent(proc, promiseId, 'resolve', value)
}

export function ipcPromiseReject(proc: TSend, promiseId: string, error: any) {
	return sendIpcPromiseEvent(proc, promiseId, 'reject', error)
}

export function ipcPromiseFactory<TArg, TValue>(
	proc: TSubscribeSend,
	promiseId: string,
	factory: (arg: TArg) => Promise<TValue>|TValue,
) {
	const listener = async (event: TIpcPromiseEvent) => {
		try {
			const value = await factory(event.value)
			ipcPromiseResolve(proc, promiseId, value)
		} catch (err) {
			ipcPromiseReject(proc, promiseId, err)
		}
	}

	once(proc, 'message', listener, event => {
		return event
			&& event.type === EVENT_TYPE_IPC_PROMISE
			&& event.id === promiseId
			&& event.action === 'create'
	})
}
