import { Method } from 'alova';
import { FallbackHandler, SilentMethodFilter, SQHookBehavior } from '../../../typings';
import {
	clearTimeoutTimer,
	forEach,
	len,
	noop,
	objectKeys,
	promiseThen,
	pushItem,
	runArgsHandler,
	setTimeoutFn
} from '../../helper';
import { falseValue, trueValue, undefinedValue } from '../../helper/variables';
import { errorHandlers, silentFactoryStatus, successHandlers } from './silentFactory';
import { MethodHandler, PromiseExecuteParameter, SilentMethod } from './SilentMethod';
import { push2PersistentSilentQueue, removeSilentMethod } from './silentMethodQueueStorage';
import SilentSubmitEvent from './SilentSubmitEvent';

export type SilentQueueMap = Record<string, SilentMethod[]>;
/** 静默方法队列集合 */
export let silentMethodQueueMap = {} as SilentQueueMap;
export const defaultQueueName = 'default';

/**
 * 合并queueMap到silentMethod队列集合
 * @param queueMap silentMethod队列集合
 */
export const merge2SilentMethodQueueMap = (queueMap: SilentQueueMap) => {
	forEach(objectKeys(queueMap), queueName => {
		silentMethodQueueMap[queueName] = [...(silentMethodQueueMap[queueName] || []), ...queueMap[queueName]];
	});
};

/**
 * 启动SilentMethod队列
 * 1. 静默提交将会放入队列中，并按顺序发送请求，只有等到前一个请求响应后才继续发送后面的请求
 * 2. 重试次数只有在未响应时才触发，在服务端响应错误或断网情况下，不会重试
 * 3. 在达到重试次数仍未成功时，当设置了nextRound（下一轮）时延迟nextRound指定的时间后再次请求，否则将在刷新后再次尝试
 * 4. 如果有resolveHandler和rejectHandler，将在请求完成后（无论成功还是失败）调用，通知对应的请求继续响应
 *
 * @param queue SilentMethod队列
 */
export const bootSilentQueue = (queue: SilentMethod[], queueName: string) => {
	const silentMethodRequest = (silentMethodInstance: SilentMethod, retriedTimes = 0) => {
		const {
			entity,
			retry = 0,
			timeout = 2000,
			nextRound = 0,
			resolveHandler = noop,
			rejectHandler = noop,
			fallbackHandlers = []
		} = silentMethodInstance;

		// 重试只有在未响应时且超时时间大于0才触发，在服务端响应错误或断网情况下，不会重试
		// 达到重试次数将认为网络不畅通而停止后续的请求
		let retryTimer: NodeJS.Timeout;
		if (timeout > 0 && (retriedTimes < retry || nextRound > 0)) {
			retryTimer = setTimeoutFn(
				() => silentMethodRequest(silentMethodInstance, ++retriedTimes),
				// 还有重试次数时使用timeout作为下次请求时间，否则是否nextRound
				retriedTimes < retry ? timeout : nextRound
			);
			if (retriedTimes >= retry) {
				runArgsHandler(fallbackHandlers);
			}
		}

		promiseThen(
			entity.send(),
			data => {
				// 请求成功，移除成功的silentMethod实力，并继续下一个请求
				queue.shift();
				removeSilentMethod(0, queueName);
				silentMethodRequest(queue[0]);

				// 如果有resolveHandler则调用它通知外部
				resolveHandler(data);
				runArgsHandler(successHandlers, new SilentSubmitEvent(trueValue, entity, retriedTimes));
			},
			reason => {
				// 请求失败，暂时根据失败信息中断请求
				rejectHandler(reason);
				runArgsHandler(
					errorHandlers,
					runArgsHandler(successHandlers, new SilentSubmitEvent(falseValue, entity, retriedTimes, reason))
				);
			}
		).finally(() => {
			clearTimeoutTimer(retryTimer);
		});
	};
	silentMethodRequest(queue[0]);
};

/**
 * 获取静默方法，根据静默方法实例匹配器格式，默认向default队列获取
 * @param matcher 静默方法实例匹配器
 */
export const getSilentMethods = (matcher: SilentMethodFilter, queue = defaultQueueName) => {};

/**
 * 将新的silentMethod实例放入队列中
 * @param methodInstance method实例
 * @param behavior 行为参数
 * @param fallbackHandlers 回退回调函数数组
 * @param retry 重试次数
 * @param timeout 请求超时时间，超时后将重试请求
 * @param nextRound 下一轮请求时间
 * @param resolveHandler promise.resolve函数
 * @param rejectHandler promise.reject函数
 * @param targetQueueName 目标队列名
 */
export const pushNewSilentMethod2Queue = <S, E, R, T, RC, RE, RH>(
	methodInstance: Method<S, E, R, T, RC, RE, RH>,
	behavior: SQHookBehavior,
	fallbackHandlers: FallbackHandler[],
	retry?: number,
	timeout?: number,
	nextRound?: number,
	resolveHandler?: PromiseExecuteParameter[0],
	rejectHandler?: PromiseExecuteParameter[1],
	methodHandler?: MethodHandler<S, E, R, T, RC, RE, RH>,
	handlerArgs?: any[],
	vTag?: string[],
	targetQueueName = defaultQueueName
) => {
	const currentQueue = (silentMethodQueueMap[targetQueueName] = silentMethodQueueMap[targetQueueName] || []);
	const isNewQueue = len(currentQueue) <= 0;
	const cache = len(fallbackHandlers) <= 0 && behavior === 'silent';
	const silentMethodInstance = new SilentMethod(
		methodInstance,
		cache,
		undefinedValue,
		retry,
		timeout,
		nextRound,
		fallbackHandlers,
		resolveHandler,
		rejectHandler,
		methodHandler,
		handlerArgs,
		vTag
	);
	// 如果没有绑定fallback事件回调，则持久化
	cache && push2PersistentSilentQueue(silentMethodInstance, targetQueueName);
	pushItem(currentQueue, silentMethodInstance);

	// 如果是新的队列且状态为已启动，则执行它
	isNewQueue && silentFactoryStatus === 1 && bootSilentQueue(currentQueue, targetQueueName);
};
