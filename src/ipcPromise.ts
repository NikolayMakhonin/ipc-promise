import {Serializable} from 'child_process'
import {
	TProcess,
	TSend,
} from './contracts'
import {off, on, once, send} from './helpers'
import { AbortController } from 'node-abort-controller'

type TIpcPromiseType = 'ipcPromise-2e07c32b-b7df-474f-89f7-dab809382670'
const EVENT_TYPE_IPC_PROMISE: TIpcPromiseType = 'ipcPromise-2e07c32b-b7df-474f-89f7-dab809382670'

type TIpcPromiseAction = 'create' | 'resolve' | 'reject'

type TIpcPromiseEvent = {
	type: TIpcPromiseType,
	promiseTypeId: string,
	promiseId: string,
	action: TIpcPromiseAction,
	value?: any,
}

function sendIpcPromiseEvent(
	proc: TSend,
	promiseTypeId: string,
	promiseId: string,
	action: TIpcPromiseAction,
	value: Serializable,
) {
	return send(proc, {
		type: EVENT_TYPE_IPC_PROMISE,
		promiseTypeId,
		promiseId,
		action,
		value,
	} as TIpcPromiseEvent)
}

export type TPromiseFactory<TArgs extends any[], TValue>
	= (signal: AbortSignal, ...args: TArgs) => Promise<TValue>|TValue

const promiseFactories = new Map<TProcess, Map<string, TPromiseFactory<any, any>>>()

function getNewPromiseId() {
	return process.pid + '-' + Date.now().toString(36) + '-' + Math.random().toString(36)
}

export function ipcPromiseCreate(proc: TProcess, promiseTypeId: string, ...args: any[]) {
	const factories = promiseFactories.get(proc)
	if (factories) {
		const factory = factories.get(promiseTypeId)
		if (factory) {
			// if ipcPromiseCreate ran in the same process as ipcPromiseFactory
			return factory(new AbortController().signal, ...args)
		}
	}

	return new Promise<void>((resolve, reject) => {
		const promiseId = getNewPromiseId()

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
				&& event.promiseTypeId === promiseTypeId
				&& event.promiseId === promiseId
				&& (event.action === 'resolve' || event.action === 'reject')
		})

		sendIpcPromiseEvent(proc, promiseTypeId, promiseId, 'create', args)
			.catch(err => {
				off(proc, 'message', listener)
				reject(err)
			})
	})
}

function ipcPromiseResolve(proc: TSend, promiseTypeId: string, promiseId: string, value: any) {
	return sendIpcPromiseEvent(proc, promiseTypeId, promiseId, 'resolve', value)
}

function ipcPromiseReject(proc: TSend, promiseTypeId: string, promiseId: string, error: any) {
	return sendIpcPromiseEvent(proc, promiseTypeId, promiseId, 'reject', error)
}

export function ipcPromiseFactory<TArgs extends any[], TValue>(
	proc: TProcess,
	promiseTypeId: string,
	factory: TPromiseFactory<TArgs, TValue>,
) {
	let factories = promiseFactories.get(proc)
	if (!factories) {
		factories = new Map()
		promiseFactories.set(proc, factories)
	}
	if (factories.has(promiseTypeId)) {
		throw new Error(`ipcPromiseFactory pid="${proc.pid}" "${promiseTypeId}" already created`)
	}

	factories.set(promiseTypeId, factory)

	const listener = async (event: TIpcPromiseEvent) => {
		const { promiseId, value: args } = event
		const abortController = new AbortController()
		const onDisconnect = () => {
			abortController.abort()
		}
		try {
			once(proc, 'disconnect', onDisconnect)
			const value = await factory(abortController.signal, ...args)
			ipcPromiseResolve(proc, promiseTypeId, promiseId, value)
		} catch (err) {
			ipcPromiseReject(proc, promiseTypeId, promiseId, err)
			off(proc, 'disconnect', onDisconnect)
		}
	}

	on(proc, 'message', listener, event => {
		return event
			&& event.type === EVENT_TYPE_IPC_PROMISE
			&& event.promiseTypeId === promiseTypeId
			&& event.action === 'create'
	})
}
