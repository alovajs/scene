import { Method } from 'alova';

export default class SilentSubmitEvent {
	/** 当前的method实例 */
	public method: Method;

	/** 是否成功 */
	public success: boolean;

	/** 已重试的次数 */
	public retriedTimes: number;

	/** 失败时抛出的错误，只在失败时有值 */
	public error?: any;
	constructor(success: boolean, methodInstance: Method, retriedTimes: number, error?: any) {
		this.method = methodInstance;
		this.success = success;
		this.retriedTimes = retriedTimes;
		this.error = error;
	}
}
