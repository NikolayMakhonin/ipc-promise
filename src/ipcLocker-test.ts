import {ipcLock, ipcUnlock} from './ipcLocker'
import {delay} from './delay'

const procId = parseInt(process.argv[2], 10)

const lockIds = [1, 2, 3, 4, 5]
lockIds.sort(() => Math.random() > 0.5 ? 1 : -1)

Promise.all(lockIds.map(async (lockId, index) => {
	await ipcLock(process, 'lock' + lockId)
	process.send({
		type: 'ipcPromise-test-lock',
		procId,
		lockId,
	})
	await delay(Math.random() * 250 + 250)
	process.send({
		type: 'ipcPromise-test-unlock',
		procId,
		lockId,
	})
	if (index < lockIds.length - 1) {
		await ipcUnlock(process, 'lock' + lockId)
	}
}))
	.then(() => {
		if (procId % 3 === 1) {
			process.disconnect()
		} else if (procId % 3 === 2) {
			// eslint-disable-next-line no-process-exit
			process.exit(0)
		} else {
			process.send({
				type: 'ipcPromise-test-killme',
				procId,
			})
			setTimeout(() => {
				// empty
			}, 120000)
		}
	})
	.catch(error => {
		console.error(error)
		process.send({
			type: 'ipcPromise-test-error',
			error,
		})
	})
