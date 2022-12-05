import { Method } from 'alova';
import { FallbackHandler } from '../../../typings';

export type PromiseExecuteParameter = Parameters<ConstructorParameters<typeof Promise<any>>['0']>;
export class SilentMethod<S = any, E = any, R = any, T = any, RC = any, RE = any, RH = any> {
	public id: string;
	public cache: boolean;
	public entity: Method<S, E, R, T, RC, RE, RH>;
	/** 重试次数 */
	public retry?: number;

	/**
	 * 请求超时时间
	 * 当达到超时时间后仍未响应则再次发送请求
	 * 单位毫秒
	 */
	public timeout?: number;

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
		cache: boolean,
		entity: Method<S, E, R, T, RC, RE, RH>,
		retry?: number,
		timeout?: number,
		nextRound?: number,
		fallbackHandlers?: FallbackHandler[],
		resolveHandler?: PromiseExecuteParameter['0'],
		rejectHandler?: PromiseExecuteParameter['1']
	) {
		this.id = id;
		this.cache = cache;
		this.entity = entity;
		this.retry = retry;
		this.timeout = timeout;
		this.nextRound = nextRound;
		this.fallbackHandlers = fallbackHandlers;
		this.resolveHandler = resolveHandler;
		this.rejectHandler = rejectHandler;
	}
}

/**
 * 创建proxy包裹的silentMethod实例
 */
// export const createSilentMethodProxy = <S, E, R, T, RC, RE, RH>(
// 	id: string,
// 	cache: boolean,
// 	entity: Method<S, E, R, T, RC, RE, RH>,
// 	retry?: number,
// 	interval?: number,
// 	nextRound?: number,
// 	fallbackHandlers?: FallbackHandler[],
// 	resolveHandler?: PromiseExecuteParameter['0'],
// 	rejectHandler?: PromiseExecuteParameter['1']
// ) =>
// 	new Proxy(
// 		new SilentMethod(id, cache, entity, retry, interval, nextRound, fallbackHandlers, resolveHandler, rejectHandler),
// 		{
// 			set: (target, p, newValue) => {
// 				target[p];
// 			}
// 		}
// 	);

type MethodEntityPayload = Omit<Method<any, any, any, any, any, any, any>, 'context' | 'response' | 'send'>;
export interface SerializedSilentMethod {
	id: string;
	entity: MethodEntityPayload;
	retry?: number;
	interval?: number;
	nextRound?: number;
}
