// 以下为减少编译代码量而添加的统一处理函数或变量
export const PromiseCls = Promise as typeof Promise<any>;
export const promiseResolve = <T>(value: T) => PromiseCls.resolve(value);
export const promiseReject = <T>(value: T) => PromiseCls.reject(value);

export const promiseThen = <T, TResult1 = T, TResult2 = never>(
	promise: Promise<T>,
	onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
	onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
): Promise<TResult1 | TResult2> => promise.then(onFulfilled, onrejected);
export const promiseCatch = <T, O>(promise: Promise<T>, onrejected: (reason: any) => O) => promise.catch(onrejected);

export const forEach = <T>(ary: T[], fn: (item: T, index: number, ary: T[]) => void) => ary.forEach(fn);
export const pushItem = <T>(ary: T[], ...item: T[]) => ary.push(...item);
export const len = (data: any[] | Uint8Array | string) => data.length;
export const undefinedValue = undefined;
export const nullValue = null;
export const trueValue = true;
export const falseValue = false;
