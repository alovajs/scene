import {
	SilentMethodFilter,
	SilentSubmitBootHandler,
	SilentSubmitCompleteHandler,
	SilentSubmitErrorHandler,
	SilentSubmitSuccessHandler
} from '../../../typings';
import { instanceOf, valueObject } from '../../helper';
import { nullValue, pushItem, undefinedValue } from '../../helper/variables';
import Null from './Null';
import SilentMethod from './SilentMethod';
import Undefined from './Undefined';

export const virtualTagSymbol = Symbol('virvual-tag');

const defaultQueueName = 'default';
/** 静默方法队列集合 */
export const silentMethodQueues = {} as Record<string, SilentMethod[]>;

/** 正在请求的静默方法实例 */
let pendingSilentMethod: SilentMethod | undefined = undefinedValue;

/**
 * 启动静默提交，它将载入缓存中的静默方法，并开始静默提交
 * 如果未传入延迟时间，则立即同步启动
 * @param delay 延迟毫秒数
 */
export const bootSilentSubmit = (delay?: number) => {};

/**
 * 为目标值打上虚拟标签的标记
 * @param target 目标对象
 * @returns void
 */
export const signVirtualTag = (target: any) => {
	if ([nullValue, undefinedValue].includes(target) || instanceOf(target, Null) || instanceOf(target, Undefined)) {
		return;
	}
	Object.defineProperty(target, virtualTagSymbol, valueObject(true));
};

/**
 * 获取静默方法，根据静默方法实例匹配器格式，默认向default队列获取
 * @param matcher 静默方法实例匹配器
 */
export const getSilentMethods = (matcher: SilentMethodFilter, queue = defaultQueueName) => {};

const proxify = (target: InstanceType<typeof Null | typeof Undefined>) =>
	new Proxy(target, {
		get: (target, key) => {
			return 0;
		}
	});

export const createNullWrapper = () => proxify(new Null());
export const createUndefinedWrapper = () => proxify(new Undefined());

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
