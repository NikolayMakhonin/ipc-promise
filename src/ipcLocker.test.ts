import {spawn} from 'child_process'
import {ipcLockerFactory} from './ipcLocker'
import path from 'path'
import assert from 'assert'

describe('ipcLocker', function () {
	this.timeout(6000000)

	it('base', async function () {
		console.log('Start')

		const locks: {
			[lockId: string]: number
		} = {}

		const procIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

		type TResult = {
			procId: number,
			lockId: number,
			lock: boolean,
		}

		const results: TResult[] = []

		function resultToString(result: TResult) {
			return `procId=${result.procId} lockId=${result.lockId} ${result.lock ? 'lock' : 'unlock'}`
		}

		await Promise.all(procIds.map(procId => {
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
			})

			const testPromise = new Promise((resolve, reject) => {
				proc.on('message', (event: any) => {
					let result: TResult
					switch (event && event.type as string) {
						case 'ipcPromise-test-lock':
							if (locks[event.lockId] != null) {
								reject(new Error(`locks[${event.lockId}] == ${locks[event.lockId]}`))
								return
							}
							locks[event.lockId] = event.procId
							result = {
								procId,
								lockId: event.lockId,
								lock: true,
							}
							break
						case 'ipcPromise-test-unlock':
							if (locks[event.lockId] == null) {
								reject(new Error(`locks[${event.lockId}] == null`))
								return
							}
							locks[event.lockId] = null
							result = {
								procId,
								lockId: event.lockId,
								lock: false,
							}
							break
						case 'ipcPromise-test-killme':
							killed = true
							process.kill(proc.pid, 'SIGKILL')
							return
						case 'ipcPromise-test-error':
							reject(event.error)
							return
						default:
							return
					}

					results.push(result)
					console.log(resultToString(result))
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

		const lockIds = [1, 2, 3, 4, 5]

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
