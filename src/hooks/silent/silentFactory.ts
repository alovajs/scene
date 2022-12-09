import { Alova } from 'alova';
import {
	SilentFactoryBootOptions,
	SilentSubmitBootHandler,
	SilentSubmitCompleteHandler,
	SilentSubmitErrorHandler,
	SilentSubmitSuccessHandler
} from '../../../typings';
import { forEach, objectKeys, pushItem, runArgsHandler } from '../../helper';
import { loadSilentQueueMap, mergeSerializer } from './silentMethodQueueStorage';
import { bootSilentQueue, merge2SilentQueueMap, silentQueueMap } from './silentQueue';

/** 依赖的alova实例，它的存储适配器、请求适配器等将用于存取SilentMethod实例，以及发送静默提交 */
export let dependentAlovaInstance: Alova<any, any, any, any, any>;

/** 事件绑定函数 */
export const bootHandlers = [] as SilentSubmitBootHandler[];
export const successHandlers = [] as SilentSubmitSuccessHandler[];
export const errorHandlers = [] as SilentSubmitErrorHandler[];
export const completeHandlers = [] as SilentSubmitCompleteHandler[];

/**
 * silentFactory状态
 * 0表示未启动
 * 1表示已启动
 * 调用bootSilentFactory后状态为1
 */
export let silentFactoryStatus = 0;

/**
 * 绑定silentSubmit启动事件
 */
export const onSilentSubmitBoot = (handler: SilentSubmitBootHandler) => {
	pushItem(bootHandlers, handler);
};

/**
 * 绑定silentSubmit成功事件
 */
export const onSilentSubmitSuccess = (handler: SilentSubmitSuccessHandler) => {
	pushItem(successHandlers, handler);
};

/**
 * 绑定silentSubmit错误事件
 */
export const onSilentSubmitError = (handler: SilentSubmitErrorHandler) => {
	pushItem(errorHandlers, handler);
};

/**
 * 绑定silentSubmit完成事件
 */
export const onSilentSubmitComplete = (handler: SilentSubmitCompleteHandler) => {
	pushItem(completeHandlers, handler);
};

/**
 * 启动静默提交，它将载入缓存中的静默方法，并开始静默提交
 * 如果未传入延迟时间，则立即同步启动
 * @param {SilentFactoryBootOptions} options 延迟毫秒数
 */
export const bootSilentFactory = (options: SilentFactoryBootOptions) => {
	dependentAlovaInstance = options.alova;
	mergeSerializer(options.serializer);
	merge2SilentQueueMap(loadSilentQueueMap());

	// 循环启动队列静默提交
	// 多条队列是并行执行的
	forEach(objectKeys(silentQueueMap), queueName => {
		bootSilentQueue(silentQueueMap[queueName], queueName);
	});
	silentFactoryStatus = 1; // 设置状态为已启动
	runArgsHandler(bootHandlers);
};
