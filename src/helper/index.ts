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

const referenceList = [] as { id: string; ref: any }[];
const uniqueIds: Record<string, 1> = {};
const generateUniqueId = () => {
	let id = Math.random().toString(36).substring(2);
	if (uniqueIds[id]) {
		id = generateUniqueId();
	}
	return id;
};

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
		const uniqueId = generateUniqueId();
		existedRef = {
			id: uniqueId,
			ref: reference
		};
		referenceList.push(existedRef);
		uniqueIds[uniqueId] = 1;
	}
	return existedRef.id;
};

export const noop = () => {};

type Constructor<T> = Function & { prototype: T };
// 判断是否为某个类的实例
export const instanceOf = <T>(arg: any, cls: Constructor<T>): arg is T => arg instanceof cls;

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
