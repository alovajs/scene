/**
 * 创建同步多次调用只在异步执行一次的执行器
 */
export default () => {
	let timer: NodeJS.Timer;

	/**
	 * 执行多次调用此函数将异步执行一次
	 */
	return (fn: () => void) => {
		if (timer) {
			clearTimeout(timer);
		}
		timer = setTimeout(fn);
	};
};
