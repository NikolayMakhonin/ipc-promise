import {TSubscribeSend} from './contracts'
import {ipcPromiseCreate, ipcPromiseFactory} from './ipcPromise'

type TLocker = {
	promise: Promise<void>,
	resolve: () => void
}

const ipcLockerPromiseId = 'ipcLocker-687867bc-7339-46fe-8061-508a0284f49a'

const lockers = new Map<string, TLocker>()

async function lockUnlock({
	lockerId,
	lock,
}: {
	lockerId: string,
	lock: boolean,
}) {
	let locker = lockers.get(lockerId)
	if (!lock) {
		if (locker) {
			lockers.delete(lockerId)
			locker.resolve()
		}
		return
	}

	if (locker) {
		await locker.promise
	}

	let resolve
	const promise = new Promise<void>(o => {
		resolve = o
	})
	locker = {
		promise,
		resolve,
	}
	lockers.set(lockerId, locker)
}

export function ipcLockerFactory(proc: TSubscribeSend) {
	ipcPromiseFactory(proc, ipcLockerPromiseId, lockUnlock)
}

export function ipcLock(proc: TSubscribeSend, lockerId: string) {
	return ipcPromiseCreate(proc, ipcLockerPromiseId + '-' + lockerId, {
		lockerId,
		lock: true,
	})
}

export function ipcUnlock(proc: TSubscribeSend, lockerId: string) {
	return ipcPromiseCreate(proc, ipcLockerPromiseId + '-' + lockerId, {
		lockerId,
		lock: false,
	})
}
