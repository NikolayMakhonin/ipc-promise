import {TProcess} from './contracts'
import {ipcPromiseCreate, ipcPromiseFactory} from './ipcPromise'

type TLocker = {
	promise: Promise<void>,
	resolve: () => void
}

const ipcLockerPromiseId = 'ipcLocker-687867bc-7339-46fe-8061-508a0284f49a'

const lockers = new Map<string, TLocker>()

export function unlock(lockerId: string) {
	const locker = lockers.get(lockerId)
	if (locker) {
		locker.resolve()
	}
	return lockerId
}

export async function lock(lockerId: string, signal?: AbortSignal): Promise<string> {
	const signalPromise = signal && !signal.aborted && new Promise(resolve => {
		signal.addEventListener('abort', resolve)
	})

	// eslint-disable-next-line no-unmodified-loop-condition
	while (!signal || !signal.aborted) {
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

	if (signal && signal.aborted) {
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
		return lock(lockerId, signal)
	}
	return unlock(lockerId)
}

export function ipcLockerFactory(proc: TProcess) {
	ipcPromiseFactory(proc, ipcLockerPromiseId, lockUnlock, false)
}

export function ipcLock(proc: TProcess, lockerId: string) {
	return ipcPromiseCreate(proc, ipcLockerPromiseId, {
		lockerId,
		lock: true,
	})
}

export function ipcUnlock(proc: TProcess, lockerId: string) {
	return ipcPromiseCreate(proc, ipcLockerPromiseId, {
		lockerId,
		lock: false,
	})
}
