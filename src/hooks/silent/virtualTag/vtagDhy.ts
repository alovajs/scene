import { vTagCollectUnified } from './helper';
import { symbolIsProxy, symbolOriginalValue } from './variables';

/**
 * 获取带虚拟标签变量的原始值
 * 此函数也将会进行vTag收集
 * @param target 目标值
 * @returns 具有原始类型的目标值
 */
export default (target: any) => {
  vTagCollectUnified(target);
  return target?.[symbolIsProxy] ? target?.[symbolOriginalValue] : target;
};
