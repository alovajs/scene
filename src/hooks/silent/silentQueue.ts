import { Method, updateState, UpdateStateCollection } from 'alova';
import {
	clearTimeoutTimer,
	forEach,
	instanceOf,
	isObject,
	len,
	noop,
	objectKeys,
	promiseThen,
	pushItem,
	runArgsHandler,
	setTimeoutFn
} from '../../helper';
import { falseValue, trueValue, undefinedValue } from '../../helper/variables';
import createSQEvent from './createSQEvent';
import {
	completeHandlers,
	errorHandlers,
	globalVirtualResponseLock,
	silentFactoryStatus,
	successHandlers
} from './globalVariables';
import { SilentMethod } from './SilentMethod';
import { persistSilentMethod, push2PersistentSilentQueue, removeSilentMethod } from './storage/silentMethodStorage';
import { replaceObjectVTag, vtagReplace } from './virtualTag/helper';
import vtagStringify from './virtualTag/vtagStringify';

export type SilentQueueMap = Record<string, SilentMethod[]>;
/** 静默方法队列集合 */
export const silentQueueMap = {} as SilentQueueMap;
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
 * 替换带有虚拟标签的method实例
 * 当它有methodHandler时调用它重新生成
 * @param vtagResponse 虚拟id和对应真实数据的集合
 */
const replaceVirtualMethod = (vtagResponse: Record<string, any>) => {
	forEach(objectKeys(silentQueueMap), queueName => {
		const currentQueue = silentQueueMap[queueName];
		forEach(currentQueue, silentMethodItem => {
			const handlerArgs = silentMethodItem.handlerArgs || [];
			forEach(handlerArgs, (arg, i) => {
				handlerArgs[i] = vtagReplace(arg, vtagResponse);
			});
			// 重新生成一个method实例并替换
			let methodUpdated = falseValue;
			if (silentMethodItem.methodHandler) {
				silentMethodItem.entity = silentMethodItem.methodHandler(...handlerArgs);
				methodUpdated = trueValue;
			} else {
				// 深层遍历entity对象，如果发现有虚拟标签或虚拟标签id，则替换为实际数据
				methodUpdated = replaceObjectVTag(silentMethodItem.entity, vtagResponse).r;
			}

			// 如果method实例有更新，则重新持久化此silentMethod实例
			// methodUpdated && silentMethodItem.cache && persistSilentMethod(silentMethodItem);
			methodUpdated && persistSilentMethod(silentMethodItem);
		});
	});
};

/**
 * 解析响应数据
 * @param response 真实响应数据
 * @param virtualResponse 虚拟响应数据
 * @returns 虚拟标签id所构成的对应真实数据集合
 */
const parseResponseWithVirtualResponse = (response: any, virtualResponse: any) => {
	let replacedResponseMap = {} as Record<string, any>;
	const virtualTagId = vtagStringify(virtualResponse);
	virtualTagId !== virtualResponse && (replacedResponseMap[virtualTagId] = response);

	if (isObject(virtualResponse)) {
		for (const i in virtualResponse) {
			replacedResponseMap = {
				...replacedResponseMap,
				...parseResponseWithVirtualResponse(response ? response[i] : undefinedValue, virtualResponse[i])
			};
		}
	}
	return replacedResponseMap;
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
	const silentMethodRequest = (silentMethodInstance: SilentMethod, retriedTimes = 0, retriedRound = 0) => {
		let {
			cache,
			id,
			behavior,
			entity,
			retry = 0,
			backoff,
			resolveHandler = noop,
			rejectHandler = noop,
			fallbackHandlers = [],
			retryHandlers = [],
			handlerArgs = []
		} = silentMethodInstance;
		const hasFallbackHandler = len(fallbackHandlers) > 0;
		nextRound = hasFallbackHandler ? 0 : nextRound; // 有fallback事件回调时不再进行下一轮

		// 重试只有在未响应时且超时时间大于0才触发，在服务端响应错误或断网情况下，不会重试
		// 达到重试次数将认为网络不畅通而停止后续的请求
		let retryTimer = setTimeoutFn(
			() => {
				retriedTimes++;
				if (timeout > 0 && (retriedTimes <= retry || nextRound > 0)) {
					silentMethodRequest(silentMethodInstance, retriedTimes, retriedRound);
					runArgsHandler(
						retryHandlers,
						createSQEvent(4, behavior, entity, silentMethodInstance, retriedTimes, handlerArgs)
					);
				} else if (retriedTimes >= retry) {
					runArgsHandler(fallbackHandlers);
					// 如果有绑定fallback事件，则会调用fallback回调，也就不再需要下一轮的尝试了
					if (!hasFallbackHandler) {
						retriedTimes = 0;
						retriedRound++;
					}
				}
			},
			// 还有重试次数时使用timeout作为下次请求时间，否则是否nextRound
			retriedTimes < retry ? timeout : nextRound
		);

		promiseThen(
			entity.send(),
			data => {
				// 请求成功，移除成功的silentMethod实力，并继续下一个请求
				queue.shift();
				cache && removeSilentMethod(id, queueName);
				// 如果有resolveHandler则调用它通知外部
				resolveHandler(data);

				let virtualTagReplacedResponseMap: Record<string, any> = {};
				const { virtualResponse, targetRefMethod, updateStates } = silentMethodInstance;
				// 替换队列中后面方法实例中的虚拟标签为真实数据
				// 开锁后才能正常访问virtualResponse的层级结构
				globalVirtualResponseLock.v = 1;
				virtualTagReplacedResponseMap = parseResponseWithVirtualResponse(data, virtualResponse);
				globalVirtualResponseLock.v = 0;

				// 将虚拟标签找出来，并依次替换
				replaceVirtualMethod(virtualTagReplacedResponseMap);

				// 如果此silentMethod带有targetRefMethod，则再次调用updateState更新数据
				// 此为延迟数据更新的实现
				if (instanceOf(targetRefMethod, Method) && updateStates && len(updateStates) > 0) {
					const updateStateCollection: UpdateStateCollection<any> = {};
					forEach(updateStates, stateName => {
						updateStateCollection[stateName] = dataRaw => replaceObjectVTag(dataRaw, virtualTagReplacedResponseMap).d;
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

				// 继续下一个silentMethod的处理
				len(queue) > 0 && silentMethodRequest(queue[0]);
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
				runArgsHandler(fallbackHandlers); // 如果直接失败了也需要调用fallback回调
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
	onBeforePush = noop
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
