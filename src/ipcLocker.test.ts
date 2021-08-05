import {spawn} from 'child_process'
import {ipcLock, ipcLockerFactory, ipcUnlock, lock, unlock} from './ipcLocker'
import path from 'path'
import assert from 'assert'
import {delay} from './delay'

describe('ipcLocker', function () {
	this.timeout(6000000)

	it('base', async function () {
		console.log('Start')

		const locks: {
			[lockId: string]: number
		} = {}

		const procIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
		const lockIds = [1, 2, 3, 4, 5]

		type TResult = {
			procId: number,
			lockId: number,
			lock: boolean,
		}

		const results: TResult[] = []

		function resultToString(result: TResult) {
			return `procId=${result.procId} lockId=${result.lockId} ${result.lock ? 'lock' : 'unlock'}`
		}

		function onLock(procId: number, lockId: number) {
			if (locks[lockId] != null) {
				throw new Error(`locks[${lockId}] == ${locks[lockId]}`)
			}
			locks[lockId] = procId
			const result: TResult = {
				procId,
				lockId: lockId,
				lock: true,
			}

			results.push(result)
			console.log(resultToString(result))
		}

		function onUnlock(procId: number, lockId: number) {
			if (locks[lockId] == null) {
				throw new Error(`locks[${lockId}] == null`)
			}
			locks[lockId] = null
			const result: TResult = {
				procId,
				lockId: lockId,
				lock: false,
			}

			results.push(result)
			console.log(resultToString(result))
		}

		ipcLockerFactory(process)
		ipcLockerFactory(process)
		ipcLockerFactory(process)

		const currentProcessPromise = Promise.all(lockIds.map(async (lockId) => {
			const abortController = new AbortController()
			await lock('lock' + lockId, abortController.signal)
			onLock(0, lockId)
			await delay(Math.random() * 250 + 250)
			onUnlock(0, lockId)
			if (lockId % 2 === 0) {
				await unlock('lock' + lockId)
			} else {
				abortController.abort()
			}
		}))

		await Promise.all(procIds.map(procId => {
			if (procId === 0) {
				return currentProcessPromise
			}

			const proc = spawn('node', [
				path.resolve(__dirname, '../dist/ipcLocker-test.js'),
				procId.toString(),
			], {
				stdio: ['ipc', 'inherit', 'inherit']
			})

			let killed = false

			const procPromise = new Promise((resolve, reject) => {
				proc.on('exit', (code) => {
					const log = `procId=${procId} exit ${code}`
					if (killed || code === 0) {
						console.log(log)
						resolve(void 0)
					} else {
						reject(log)
					}
				})
				proc.on('error', reject)
				ipcLockerFactory(proc)
				ipcLockerFactory(proc)
				ipcLockerFactory(proc)
			})

			const testPromise = new Promise((resolve, reject) => {
				proc.on('message', (event: any) => {
					try {
						switch (event && event.type as string) {
							case 'ipcPromise-test-lock':
								onLock(procId, event.lockId)
								break
							case 'ipcPromise-test-unlock':
								onUnlock(procId, event.lockId)
								break
							case 'ipcPromise-test-killme':
								killed = true
								process.kill(proc.pid, 'SIGKILL')
								break
							case 'ipcPromise-test-error':
								reject(event.error)
								break
						}
					} catch (err) {
						reject(err)
					}
				})
			})

			return Promise.race([
				testPromise,
				procPromise,
			])
		}))

		console.log('End')

		const resultsSorted = results.slice().sort((o1, o2) => {
			if (o1.procId !== o2.procId) {
				return o1.procId > o2.procId ? 1 : -1
			}
			if (o1.lockId !== o2.lockId) {
				return o1.lockId > o2.lockId ? 1 : -1
			}
			return 0
		})

		const resultsCheck = procIds.flatMap(procId => {
			return lockIds.flatMap(lockId => [
				{procId, lockId, lock: true},
				{procId, lockId, lock: false},
			])
		})

		assert.deepStrictEqual(resultsSorted, resultsCheck)

		// console.log(results.map(resultToString).join('\r\n'))
	})
})
