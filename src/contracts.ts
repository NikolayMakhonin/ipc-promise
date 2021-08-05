export type TSubscribe = {
	[key in 'on' | 'addListener']: (event: string | symbol, listener: (...args: any[]) => void) => any;
} & {
	[key in 'off' | 'removeListener']: (event: string | symbol, listener: (...args: any[]) => void) => any;
}

export type TSend = {
	send(
		message: any,
		sendHandle?: any,
		options?: { [key in string]: any },
		callback?: (error: Error | null) => void,
	): any;
} | {
	emit(event: string | symbol, ...args: any[]): boolean;
}

export type TSubscribeSend = TSubscribe & TSend
