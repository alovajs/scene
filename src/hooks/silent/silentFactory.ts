import {
	SilentFactoryBootOptions,
	SilentSubmitBootHandler,
	SilentSubmitCompleteHandler,
	SilentSubmitErrorHandler,
	SilentSubmitSuccessHandler
} from '../../../typings';
import { pushItem } from '../../helper';
import { loadSilentQueueMap, mergeSerializer, setStorageAdapter } from './persistSilentMethod';
import { setSilentMethodQueueMap } from './silentQueue';

/**
 * 启动静默提交，它将载入缓存中的静默方法，并开始静默提交
 * 如果未传入延迟时间，则立即同步启动
 * @param delay 延迟毫秒数
 */
export const bootSilentFactory = (options: SilentFactoryBootOptions) => {
	setStorageAdapter(options.storageAdapter);
	mergeSerializer(options.serializer);
	setSilentMethodQueueMap(loadSilentQueueMap());
};

/** 事件绑定函数 */
const bootHandlers = [] as SilentSubmitBootHandler[];
const successHandlers = [] as SilentSubmitSuccessHandler[];
const errorHandlers = [] as SilentSubmitErrorHandler[];
const completeHandlers = [] as SilentSubmitCompleteHandler[];
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
