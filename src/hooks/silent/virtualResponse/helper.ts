import { GeneralFn } from '../../../helper';
import { undefinedValue } from '../../../helper/variables';
import { vDataIdCollectBasket } from '../globalVariables';
import { symbolVDataId } from './variables';

/**
 * 统一的vData收集函数
 * 它将在以下4个位置被调用
 * 1. 访问子属性时
 * 2. 参与计算并触发[Symbol.toPrimitive]时
 * 3. 获取vData的id时
 * 4. 获取其原始值时
 *
 * @param returnValue 返回值，如果是函数则调用它
 * @returns 收集函数
 */
export const vDataCollectUnified = (target: any) => {
  const vDataId = target?.[symbolVDataId];
  vDataId && vDataIdCollectBasket && (vDataIdCollectBasket[vDataId] = undefinedValue);
};

/**
 * 创建虚拟数据id收集的getter函数
 * @param valueReturnFn 返回值函数
 * @returns getter函数
 */
export const vDataCollectGetter = (valueReturnFn: GeneralFn) =>
  function (this: any, arg?: any) {
    vDataCollectUnified(this);
    return valueReturnFn(this, arg);
  };

export const vDataGetter = (key: string) => vDataCollectGetter((thisObj: any) => thisObj.__proto__[key].call(thisObj));
