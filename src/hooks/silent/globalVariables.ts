import { Alova } from 'alova';
import {
	SilentSubmitBootHandler,
	SilentSubmitCompleteHandler,
	SilentSubmitErrorHandler,
	SilentSubmitSuccessHandler
} from '../../../typings';
import { createAssert } from '../../helper';

/**
 * 全局的虚拟标签收集数组
 * 它只会在method创建时为数组，其他时间为undefined
 */
export let vtagIdCollectBasket: Record<string, undefined> | undefined;
export const setVtagIdCollectBasket = (value: typeof vtagIdCollectBasket) => (vtagIdCollectBasket = value);

/** 依赖的alova实例，它的存储适配器、请求适配器等将用于存取SilentMethod实例，以及发送静默提交 */
export let dependentAlovaInstance: Alova<any, any, any, any, any>;
export const setDependentAlova = (alovaInst: Alova<any, any, any, any, any>) => (dependentAlovaInstance = alovaInst);

/**
 * silentFactory状态
 * 0表示未启动
 * 1表示已启动
 * 调用bootSilentFactory后状态为1
 */
export let silentFactoryStatus = 0;
export const setSilentFactoryStatus = (status: 0 | 1) => (silentFactoryStatus = status);

/** 事件绑定函数 */
export const bootHandlers = [] as SilentSubmitBootHandler[];
export const successHandlers = [] as SilentSubmitSuccessHandler[];
export const errorHandlers = [] as SilentSubmitErrorHandler[];
export const completeHandlers = [] as SilentSubmitCompleteHandler[];

/**
 * 使用全局唯一的虚拟响应锁
 * 0表示锁定：层级访问时只返回对应值的原始值，而非proxy实例
 * 1表示半锁定：层级访问时将返回proxy实例，但不能随意访问任意层级了
 * 2表示完全开锁：完全开锁后虚拟响应可以访问任意层级并生成它的层级结构
 */
export const globalVirtualResponseLock = { v: 0 as 0 | 1 | 2 };

export const silentAssert = createAssert('hooks/silent');
