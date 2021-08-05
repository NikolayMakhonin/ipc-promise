import {ipcLock, ipcUnlock} from './ipcLocker'
import {delay} from './delay'

const procId = parseInt(process.argv[2], 10)

const lockIds = [1, 2, 3, 4, 5]
lockIds.sort(() => Math.random() > 0.5 ? 1 : -1)

Promise.all(lockIds.map(async lockId => {
	await ipcLock(process, 'lock' + lockId)
	process.send({
		type: 'ipcPromise-test-lock',
		procId,
		lockId,
	})
	await delay(500)
	process.send({
		type: 'ipcPromise-test-unlock',
		procId,
		lockId,
	})
	// if (lockId < lockIds.length - 1) {
		await ipcUnlock(process, 'lock' + lockId)
	// }
}))
	.catch(error => {
		console.error(error)
		process.send({
			type: 'ipcPromise-test-error',
			error,
		})
	})
