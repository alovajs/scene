import { vDataCollectUnified } from './helper';
import { symbolIsProxy, symbolOriginalValue } from './variables';

/**
 * 获取带虚拟数据变量的原始值
 * 此函数也将会进行vData收集
 * @param target 目标值
 * @returns 具有原始类型的目标值
 */
export default (target: any) => {
  vDataCollectUnified(target);
  return target?.[symbolIsProxy] ? target?.[symbolOriginalValue] : target;
};
