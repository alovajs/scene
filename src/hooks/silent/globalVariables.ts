import { Alova } from 'alova';
import {
  BeforeSilentSubmitHandler,
  SilentSubmitBootHandler,
  SilentSubmitErrorHandler,
  SilentSubmitFailHandler,
  SilentSubmitSuccessHandler
} from '../../../typings/general';
import { createAssert } from '../../helper';

/**
 * 全局的虚拟数据收集数组
 * 它只会在method创建时为数组，其他时间为undefined
 *
 * 解释：收集虚拟数据的目的为了判断某个method实例内是否使用了虚拟数据
 * 包括以下形式：
 * useSQRequest((vDataId) => createMethod({ vDataId }) // 引用函数参数
 * useSQRequest(() => createMethod({ vDataId }) // 直接引用作用域参数
 *
 * 甚至是：
 * function createMethod(obj) {
 *   return alovaInst.Get('/list', {
 *     params: { status: obj.vDataId ? 1 : 0 }
 *   })
 * }
 * useSQRequest(() => createMethod(obj) // 直接引用作用域参数
 *
 * 使用虚拟数据的方式包含：
 * 1. 直接作为参数赋值
 * 2. 使用虚拟数据id
 * 3. 间接使用虚拟数据，如
 *    vData ? 1 : 0
 *    !!vData
 *    vData + 1
 *    等作为计算参数参与的形式
 */
export let vDataIdCollectBasket: Record<string, undefined> | undefined;
export const setVDataIdCollectBasket = (value: typeof vDataIdCollectBasket) => (vDataIdCollectBasket = value);

/** 依赖的alova实例，它的存储适配器、请求适配器等将用于存取SilentMethod实例，以及发送静默提交 */
export let dependentAlovaInstance: Alova<any, any, any, any, any>;
export const setDependentAlova = (alovaInst: Alova<any, any, any, any, any>) => (dependentAlovaInstance = alovaInst);

/**
 * silentFactory状态
 * 0表示未启动
 * 1表示进行中，调用bootSilentFactory后变更
 * 2表示请求失败，即按重试规则请求达到最大次数时，或不匹配重试规则时变更
 */
export let silentFactoryStatus = 0;
export const setSilentFactoryStatus = (status: 0 | 1 | 2) => (silentFactoryStatus = status);

/** 事件绑定函数 */
export const bootHandlers = [] as SilentSubmitBootHandler[];
export const beforeHandlers = [] as BeforeSilentSubmitHandler[];
export const successHandlers = [] as SilentSubmitSuccessHandler[];
export const errorHandlers = [] as SilentSubmitErrorHandler[];
export const failHandlers = [] as SilentSubmitFailHandler[];

/** silentAssert */
export const silentAssert = createAssert('useSQHook');
