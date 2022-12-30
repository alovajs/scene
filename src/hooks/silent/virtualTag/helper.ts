import { isFn, isObject, isString, walkObject } from '../../../helper';
import { undefinedValue } from '../../../helper/variables';
import { vtagIdCollectBasket } from '../globalVariables';
import { regVirtualTag, symbolIsProxy, symbolVTagId } from './variables';
import vtagStringify from './vtagStringify';

/**
 * 统一的vTag收集函数
 * @param returnValue 返回值，如果是函数则调用它
 * @returns 收集函数
 */
export const vTagCollectUnified = (target: any) => {
  const virtualTagId = target?.[symbolVTagId];
  virtualTagId && vtagIdCollectBasket && (vtagIdCollectBasket[virtualTagId] = undefinedValue);
};

/**
 * 创建虚拟标签id收集的getter函数
 * @param returnValue 返回值，是函数时则调用它
 * @returns getter函数
 */
export const vTagCollectGetter = (returnValue: any) =>
  function (this: any, arg?: any) {
    vTagCollectUnified(this);
    return isFn(returnValue) ? returnValue(this, arg) : returnValue;
  };

/**
 * 深层遍历目标数据，并将虚拟标签替换为实际数据
 * @param target 目标数据
 * @param vtagResponse 虚拟标签和实际数据的集合
 * @returns 是否有替换数据
 */
export const deepReplaceVTag = (target: any, vtagResponse: Record<string, any>) => {
  // 搜索单一值并将虚拟标签或标签id替换为实际值
  const vtagReplace = (value: any) => {
    const virtualTagId = vtagStringify(value);
    // 这边的判断是，如果直接是虚拟标签对象则在vtagResponse中寻找实际值替换
    // 否则，如果是字符串，则里面可能包含虚拟标签id，也需将它替换为实际值
    return virtualTagId !== value
      ? vtagResponse[virtualTagId]
      : isString(value)
      ? value.replace(regVirtualTag, mat => vtagResponse[mat])
      : value;
  };
  if (isObject(target) && !target?.[symbolIsProxy]) {
    walkObject(target, vtagReplace);
  } else {
    target = vtagReplace(target);
  }
  return target;
};
