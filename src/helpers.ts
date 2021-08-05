import {TSend, TSubscribe} from './contracts'
import {Serializable} from 'child_process'

export function on<TEvent>(
	proc: TSubscribe,
	eventName: string | symbol,
	listener: (event: TEvent) => void,
	filter?: (event: TEvent) => boolean,
) {
	const _on = proc.addListener || proc.on
	const _listener = (_event: TEvent) => {
		if (!filter || filter(_event)) {
			listener(_event)
		}
	}
	_on.call(proc, eventName, _listener)
}

export function once<TEvent>(
	proc: TSubscribe,
	eventName: string | symbol,
	listener: (event: TEvent) => void,
	filter?: (event: TEvent) => boolean,
) {
	const _listener = (_event: TEvent) => {
		off(proc, eventName, _listener)
		listener(_event)
	}
	on(proc, eventName, _listener, filter)
}

export function off(
	proc: TSubscribe,
	eventName: string | symbol,
	listener: (event: any) => void,
) {
	const _off = proc.removeListener || proc.off
	_off.call(proc, eventName, listener)
}

export function send(proc: TSend, message: Serializable) {
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
