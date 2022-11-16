export const noop = () => {};

/**
 * 自定义断言函数，表达式为false时抛出错误
 * @param expression 判断表达式，true或false
 * @param msg 断言消息
 */
export function createAssert(prefix: string) {
	return (expression: boolean, msg: string) => {
		if (!expression) {
			throw new Error(`[alova/${prefix}:Error]${msg}`);
		}
	};
}
