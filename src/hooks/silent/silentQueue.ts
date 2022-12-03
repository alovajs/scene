import { Method } from 'alova';
import { FallbackHandler, SilentMethodFilter, SQHookBehavior } from '../../../typings';
import { len, pushItem, uuid } from '../../helper';
import { undefinedValue } from '../../helper/variables';
import { pushSilentMethod } from './persistSilentMethod';
import { PromiseExecuteParameter, SilentMethod } from './SilentMethod';

export const defaultQueueName = 'default';
export type SilentQueueMap = Record<string, SilentMethod[]>;
/** 静默方法队列集合 */
export let silentMethodQueueMap = {} as SilentQueueMap;

/** 正在请求的静默方法实例 */
let pendingSilentMethod: SilentMethod | undefined = undefinedValue;

/**
 * 设置silentMethod队列集合
 * @param queueMap silentMethod队列集合
 */
export const setSilentMethodQueueMap = (queueMap: SilentQueueMap) => {
	silentMethodQueueMap = queueMap;
};

/**
 * 获取静默方法，根据静默方法实例匹配器格式，默认向default队列获取
 * @param matcher 静默方法实例匹配器
 */
export const getSilentMethods = (matcher: SilentMethodFilter, queue = defaultQueueName) => {};

export const pushNewSilentMethod = <S, E, R, T, RC, RE, RH>(
	methodInstance: Method<S, E, R, T, RC, RE, RH>,
	behavior: SQHookBehavior,
	fallbackHandlers: FallbackHandler[],
	retry?: number,
	interval?: number,
	nextRound?: number,
	resolveHandler?: PromiseExecuteParameter[0],
	rejectHandler?: PromiseExecuteParameter[1],
	queue = defaultQueueName
) => {
	const currentQueue = (silentMethodQueueMap[queue] = silentMethodQueueMap[queue] || []);
	const silentMethodInstance = new SilentMethod(
		uuid(),
		methodInstance,
		retry,
		interval,
		nextRound,
		fallbackHandlers,
		resolveHandler,
		rejectHandler
	);

	// 如果没有绑定fallback事件回调，则持久化
	if (len(fallbackHandlers) <= 0 && behavior === 'silent') {
		pushSilentMethod(silentMethodInstance);
	}

	pushItem(currentQueue, silentMethodInstance);
};
