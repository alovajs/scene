import { Method, updateState, UpdateStateCollection } from 'alova';
import {
	clearTimeoutTimer,
	forEach,
	instanceOf,
	len,
	noop,
	objectKeys,
	promiseThen,
	pushItem,
	runArgsHandler,
	setTimeoutFn
} from '../../helper';
import { undefinedValue } from '../../helper/variables';
import createSQEvent from './createSQEvent';
import { completeHandlers, errorHandlers, silentFactoryStatus, successHandlers } from './silentFactory';
import { SilentMethod } from './SilentMethod';
import { push2PersistentSilentQueue, removeSilentMethod } from './silentMethodQueueStorage';
import { parseResponseWithVirtualResponse, replaceVirtualMethod, replaceVTag } from './virtualTag/helper';

export type SilentQueueMap = Record<string, SilentMethod[]>;
/** 静默方法队列集合 */
export let silentQueueMap = {} as SilentQueueMap;
export const defaultQueueName = 'default';

/**
 * 合并queueMap到silentMethod队列集合
 * @param queueMap silentMethod队列集合
 */
export const merge2SilentQueueMap = (queueMap: SilentQueueMap) => {
	forEach(objectKeys(queueMap), queueName => {
		silentQueueMap[queueName] = [...(silentQueueMap[queueName] || []), ...queueMap[queueName]];
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
			behavior,
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

				const { virtualResponse, targetRefMethod, updateStates } = silentMethodInstance;
				// 替换队列中后面方法实例中的虚拟标签为真实数据

				const virtualTagReplacedResponseMap = parseResponseWithVirtualResponse(data, virtualResponse);

				// 将虚拟标签找出来，并依次替换
				replaceVirtualMethod(virtualTagReplacedResponseMap);

				// 如果此silentMethod带有targetRefMethod，则再次调用updateState更新数据
				// 此为延迟数据更新的实现
				if (instanceOf(targetRefMethod, Method) && updateStates && len(updateStates) > 0) {
					const updateStateCollection: UpdateStateCollection<any> = {};
					forEach(updateStates, stateName => {
						updateStateCollection[stateName] = dataRaw => replaceVTag(dataRaw, virtualTagReplacedResponseMap).d;
					});
					updateState(targetRefMethod, updateStateCollection);
				}

				// 触发全局的成功事件和完成事件
				const createGlobalSuccessEvent = () =>
					createSQEvent(
						0,
						behavior,
						entity,
						silentMethodInstance,
						retriedTimes,
						undefinedValue,
						data,
						virtualTagReplacedResponseMap
					);
				runArgsHandler(successHandlers, createGlobalSuccessEvent());
				runArgsHandler(completeHandlers, createGlobalSuccessEvent());
			},
			reason => {
				// 请求失败，暂时根据失败信息中断请求
				rejectHandler(reason);
				const createGlobalErrorEvent = () =>
					createSQEvent(
						1,
						behavior,
						entity,
						silentMethodInstance,
						retriedTimes,
						undefinedValue,
						undefinedValue,
						undefinedValue,
						reason
					);
				runArgsHandler(errorHandlers, createGlobalErrorEvent());
				runArgsHandler(completeHandlers, createGlobalErrorEvent());
			}
		).finally(() => {
			clearTimeoutTimer(retryTimer);
		});
	};
	silentMethodRequest(queue[0]);
};

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
	silentMethodInstance: SilentMethod<S, E, R, T, RC, RE, RH>,
	targetQueueName = defaultQueueName,
	onBeforePush: () => void
) => {
	const currentQueue = (silentQueueMap[targetQueueName] = silentQueueMap[targetQueueName] || []);
	const isNewQueue = len(currentQueue) <= 0;

	onBeforePush();

	// silent行为下，如果没有绑定fallback事件回调，则持久化
	silentMethodInstance.cache && push2PersistentSilentQueue(silentMethodInstance, targetQueueName);
	pushItem(currentQueue, silentMethodInstance);

	// 如果是新的队列且状态为已启动，则执行它
	isNewQueue && silentFactoryStatus === 1 && bootSilentQueue(currentQueue, targetQueueName);
};
