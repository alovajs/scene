import { Alova, Method } from 'alova';
import { PromiseCls } from './variables';

export const promiseResolve = <T>(value: T) => PromiseCls.resolve(value);
export const promiseReject = <T>(value: T) => PromiseCls.reject(value);
export const promiseThen = <T, TResult1 = T, TResult2 = never>(
	promise: Promise<T>,
	onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
	onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
): Promise<TResult1 | TResult2> => promise.then(onFulfilled, onrejected);
export const promiseCatch = <T, O>(promise: Promise<T>, onrejected: (reason: any) => O) => promise.catch(onrejected);
export const promiseFinally = <T, O>(promise: Promise<T>, onrejected: (reason: any) => O) => promise.catch(onrejected);

export const forEach = <T>(ary: T[], fn: (item: T, index: number, ary: T[]) => void) => ary.forEach(fn);
export const pushItem = <T>(ary: T[], ...item: T[]) => ary.push(...item);
export const includes = <T>(ary: T[], target: T) => ary.includes(target);
export const len = (data: any[] | Uint8Array | string) => data.length;

export const getContext = <S, E, R, T, RC, RE, RH>(methodInstance: Method<S, E, R, T, RC, RE, RH>) =>
	methodInstance.context;
export const getConfig = <S, E, R, T, RC, RE, RH>(methodInstance: Method<S, E, R, T, RC, RE, RH>) =>
	methodInstance.config;
export const getContextOptions = <S, E, RC, RE, RH>(alovaInstance: Alova<S, E, RC, RE, RH>) => alovaInstance.options;
export const getOptions = <S, E, R, T, RC, RE, RH>(methodInstance: Method<S, E, R, T, RC, RE, RH>) =>
	getContextOptions(getContext(methodInstance));
export const JSONStringify = (
	value: any,
	replacer?: ((this: any, key: string, value: any) => any) | undefined,
	space?: string | number | undefined
) => JSON.stringify(value, replacer, space);
export const JSONParse = (text: string, reviver?: ((this: any, key: string, value: any) => any) | undefined) =>
	JSON.parse(text, reviver);
export const objectKeys = (obj: any) => Object.keys(obj);
export const objectValues = <T>(obj: Record<any, T>) => Object.values(obj);
export const setTimeoutFn = (fn: GeneralFn, delay = 0) => setTimeout(fn, delay);
export const clearTimeoutTimer = (timer: NodeJS.Timeout) => clearTimeout(timer);

/**
 * 创建同步多次调用只在异步执行一次的执行器
 */
export const createSyncOnceRunner = (delay = 0) => {
	let timer: NodeJS.Timer;

	/**
	 * 执行多次调用此函数将异步执行一次
	 */
	return (fn: () => void) => {
		if (timer) {
			clearTimeout(timer);
		}
		timer = setTimeout(fn, delay);
	};
};

/**
 * 创建uuid简易版
 * @returns uuid
 */
export const uuid = () => {
	const timestamp = new Date().getTime();
	return Math.floor(Math.random() * timestamp).toString(36);
};

const referenceList = [] as { id: string; ref: any }[];
/**
 * 获取唯一的引用类型id，如果是非引用类型则返回自身
 * @param {reference} 引用类型数据
 * @returns uniqueId
 */
export const getUniqueReferenceId = (reference: any) => {
	const refType = typeof reference;
	if (!['object', 'function', 'symbol'].includes(refType)) {
		return reference;
	}

	let existedRef = referenceList.find(({ ref }) => ref === reference);
	if (!existedRef) {
		const uniqueId = uuid();
		existedRef = {
			id: uniqueId,
			ref: reference
		};
		referenceList.push(existedRef);
	}
	return existedRef.id;
};

export const noop = () => {};

// 判断是否为某个类的实例
export const instanceOf = <T>(arg: any, cls: new (...args: any[]) => T): arg is T => arg instanceof cls;

/**
 * 自定义断言函数，表达式为false时抛出错误
 * @param expression 判断表达式，true或false
 * @param msg 断言消息
 */
export const createAssert = (prefix: string) => {
	return (expression: boolean, msg: string) => {
		if (!expression) {
			throw new Error(`[alova/${prefix}:Error]${msg}`);
		}
	};
};

export const valueObject = <T>(value: T) => ({
	value
});

export type GeneralFn = (...args: any[]) => any;
/**
 * 批量执行时间回调函数，并将args作为参数传入
 * @param handlers 事件回调数组
 * @param args 函数参数
 */
export const runArgsHandler = (handlers: GeneralFn[], ...args: any[]) => forEach(handlers, handler => handler(...args));

/**
 * 判断参数是否为函数
 * @param fn 任意参数
 * @returns 该参数是否为函数
 */
export const isFn = (arg: any): arg is GeneralFn => typeof arg === 'function';

/**
 * 判断参数是否为数字
 * @param arg 任意参数
 * @returns 该参数是否为数字
 */
export const isNumber = (arg: any): arg is number => typeof arg === 'number' && !isNaN(arg);

/**
 * 判断参数是否为字符串
 * @param arg 任意参数
 * @returns 该参数是否为字符串
 */
export const isString = (arg: any): arg is string => typeof arg === 'string';
