import { Method } from 'alova';
import { FallbackHandler, SQHookBehavior } from '../../../typings';
import { uuid } from '../../helper';
import { silentQueueMap } from './silentQueue';
import { persistSilentMethod } from './storage/silentMethodStorage';

export type PromiseExecuteParameter = Parameters<ConstructorParameters<typeof Promise<any>>['0']>;
export type MethodHandler<S, E, R, T, RC, RE, RH> = (...args: any[]) => Method<S, E, R, T, RC, RE, RH>;
export class SilentMethod<S = any, E = any, R = any, T = any, RC = any, RE = any, RH = any> {
	public id: string;
	/** 是否为持久化实例 */
	public cache: boolean;
	/** 实例的行为，queue或silent */
	public behavior: SQHookBehavior;
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

	/** 回退事件回调，当重试次数达到上限但仍然失败时，此回调将被调用 */
	public fallbackHandlers?: FallbackHandler[];

	/** Promise的resolve函数，调用将通过对应的promise对象 */
	public resolveHandler?: PromiseExecuteParameter['0'];

	/** Promise的reject函数，调用将失败对应的promise对象 */
	public rejectHandler?: PromiseExecuteParameter['1'];

	/** 虚拟响应数据，通过updateStateEffect保存到此 */
	public virtualResponse?: any;

	/**
	 * method实例生成函数，由虚拟标签内的Symbol.toPrimitive函数保存至此
	 * 当虚拟响应数据被替换为实际响应数据时，将调用此函数重新创建method，达到替换虚拟标签的目的
	 */
	public methodHandler?: MethodHandler<S, E, R, T, RC, RE, RH>;

	/**
	 * methodHandler的调用参数
	 * 如果其中有虚拟标签也将在请求被响应后被实际数据替换
	 */
	public handlerArgs?: any[];

	/** method创建时所使用的虚拟标签id */
	public vTags?: string[];

	/**
	 * 状态更新所指向的method实例
	 * 当调用updateStateEffect时将会更新状态的目标method实例保存在此
	 * 目的是为了让刷新页面后，提交数据也还能找到需要更新的状态
	 */
	public targetRefMethod?: Method;

	/** 调用updateStateEffect更新了哪些状态 */
	public updateStates?: string[];
	constructor(
		entity: Method<S, E, R, T, RC, RE, RH>,
		cache: boolean,
		behavior: SQHookBehavior,
		id = uuid(),
		retry?: number,
		timeout?: number,
		nextRound?: number,
		fallbackHandlers?: FallbackHandler[],
		resolveHandler?: PromiseExecuteParameter['0'],
		rejectHandler?: PromiseExecuteParameter['1'],
		methodHandler?: MethodHandler<S, E, R, T, RC, RE, RH>,
		handlerArgs?: any[],
		vTag?: string[]
	) {
		this.entity = entity;
		this.cache = cache;
		this.behavior = behavior;
		this.id = id;
		this.retry = retry;
		this.timeout = timeout;
		this.nextRound = nextRound;
		this.fallbackHandlers = fallbackHandlers;
		this.resolveHandler = resolveHandler;
		this.rejectHandler = rejectHandler;
		this.methodHandler = methodHandler;
		this.handlerArgs = handlerArgs;
		this.vTags = vTag;
	}

	/**
	 * 允许缓存时持久化更新当前实例
	 */
	public save() {
		this.cache && persistSilentMethod(this);
	}

	/**
	 * 移除当前实例，它将在持久化存储中同步移除
	 */
	public remove() {
		for (const queueName in silentQueueMap) {
			const index = silentQueueMap[queueName].indexOf(this);
			if (index >= 0) {
				silentQueueMap[queueName].splice(index, 1);
				break;
			}
		}
	}
}

type MethodEntityPayload = Omit<Method<any, any, any, any, any, any, any>, 'context' | 'response' | 'send'>;
export interface SerializedSilentMethod {
	id: string;
	behavior: SQHookBehavior;
	entity: MethodEntityPayload;
	retry?: number;
	interval?: number;
	nextRound?: number;
	targetRefMethod?: MethodEntityPayload;
}
