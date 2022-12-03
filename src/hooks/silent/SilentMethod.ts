import { Method } from 'alova';
import { FallbackHandler } from '../../../typings';

type MethodEntityPayload = Omit<Method<any, any, any, any, any, any, any>, 'context' | 'response' | 'send'>;
export type PromiseExecuteParameter = Parameters<ConstructorParameters<typeof Promise<any>>['0']>;
export class SilentMethod {
	public id: string;
	public entity: MethodEntityPayload;
	/** 重试次数 */
	public retry?: number;

	/** 每次重试的间隔时间，表示如果在此时间内未响应则再次发送请求，单位毫秒 */
	public interval?: number;

	/**
	 * 失败后下一轮重试的时间，单位毫秒
	 * 如果不指定，则在下次刷新时再次触发
	 */
	public nextRound?: number;
	public fallbackHandlers?: FallbackHandler[];

	public resolveHandler?: PromiseExecuteParameter['0'];
	public rejectHandler?: PromiseExecuteParameter['1'];
	constructor(
		id: string,
		entity: MethodEntityPayload,
		retry?: number,
		interval?: number,
		nextRound?: number,
		fallbackHandlers?: FallbackHandler[],
		resolveHandler?: PromiseExecuteParameter['0'],
		rejectHandler?: PromiseExecuteParameter['1']
	) {
		this.id = id;
		this.entity = entity;
		this.retry = retry;
		this.interval = interval;
		this.nextRound = nextRound;
		this.fallbackHandlers = fallbackHandlers;
		this.resolveHandler = resolveHandler;
		this.rejectHandler = rejectHandler;
	}
}

/**
 * 创建proxy包裹的silentMethod实例
 */
export const createSilentMethodProxy = () => {};

export interface SerializedSilentMethod {
	id: string;
	entity: MethodEntityPayload;
	retry?: number;
	interval?: number;
	nextRound?: number;
}
