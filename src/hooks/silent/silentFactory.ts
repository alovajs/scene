import {
	SilentFactoryBootOptions,
	SilentSubmitBootHandler,
	SilentSubmitCompleteHandler,
	SilentSubmitErrorHandler,
	SilentSubmitSuccessHandler
} from '../../../typings';
import { forEach, objectKeys, pushItem, runArgsHandler, setTimeoutFn } from '../../helper';
import {
	bootHandlers,
	completeHandlers,
	errorHandlers,
	setDependentAlova,
	setSilentFactoryStatus,
	successHandlers
} from './globalVariables';
import { mergeSerializer } from './serializer';
import { bootSilentQueue, merge2SilentQueueMap, silentQueueMap } from './silentQueue';
import loadSilentQueueMapFromStorage from './storage/loadSilentQueueMapFromStorage';

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
	setDependentAlova(options.alova);
	mergeSerializer(options.serializers);
	merge2SilentQueueMap(loadSilentQueueMapFromStorage());

	setTimeoutFn(() => {
		// 循环启动队列静默提交
		// 多条队列是并行执行的
		forEach(objectKeys(silentQueueMap), queueName => {
			bootSilentQueue(silentQueueMap[queueName], queueName);
		});
		setSilentFactoryStatus(1); // 设置状态为已启动
		runArgsHandler(bootHandlers);
	}, options.delay ?? 2000);
};
