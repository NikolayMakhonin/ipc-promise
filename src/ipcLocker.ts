import {TSubscribeSend} from './contracts'
import {ipcPromiseCreate, ipcPromiseFactory} from './ipcPromise'

type TLocker = {
	promise: Promise<void>,
	resolve: () => void
}

const ipcLockerPromiseId = 'ipcLocker-687867bc-7339-46fe-8061-508a0284f49a'

const lockers = new Map<string, TLocker>()

function unlock(lockerId: string) {
	const locker = lockers.get(lockerId)
	if (locker) {
		locker.resolve()
	}
	return lockerId
}

async function lock(signal: AbortSignal, lockerId: string): Promise<string> {
	const signalPromise = !signal.aborted && new Promise(resolve => {
		signal.addEventListener('abort', resolve)
	})

	while (!signal.aborted) {
		const locker = lockers.get(lockerId)

		if (!locker) {
			break
		}

		// eslint-disable-next-line no-await-in-loop
		await Promise.race([
			locker.promise,
			signalPromise,
		])
	}

	if (signal.aborted) {
		return lockerId
	}

	let resolve
	const promise = Promise.race([
		new Promise<void>(o => {
			resolve = o
		}),
		signalPromise,
	])
		.then(() => {
			lockers.delete(lockerId)
		})

	const locker = {
		promise,
		resolve,
	}
	lockers.set(lockerId, locker)

	return lockerId
}

function lockUnlock(signal: AbortSignal, {
	lockerId,
	lock: _lock,
}: {
	lockerId: string,
	lock: boolean,
}): Promise<string>|string {
	if (_lock) {
		return lock(signal, lockerId)
	}
	return unlock(lockerId)
}

export function ipcLockerFactory(proc: TSubscribeSend) {
	ipcPromiseFactory(proc, ipcLockerPromiseId, lockUnlock)
}

export function ipcLock(proc: TSubscribeSend, lockerId: string) {
	return ipcPromiseCreate(proc, ipcLockerPromiseId, {
		lockerId,
		lock: true,
	})
}

export function ipcUnlock(proc: TSubscribeSend, lockerId: string) {
	return ipcPromiseCreate(proc, ipcLockerPromiseId, {
		lockerId,
		lock: false,
	})
}
