import { defineProperties, includes, instanceOf, isFn, isObject, newInstance, uuid } from '../../../helper';
import {
  nullValue,
  ObjectCls,
  strToString,
  strValueOf,
  symbolToPrimitive,
  trueValue,
  undefinedValue
} from '../../../helper/variables';
import { globalVirtualResponseLock } from '../globalVariables';
import { vTagCollectGetter, vTagCollectUnified } from './helper';
import Null from './Null';
import Undefined from './Undefined';
import valueOf from './valueOf';
import { symbolIsProxy, symbolVirtualTag } from './variables';

/**
 * 创建虚拟标签
 * @returns 虚拟响应数据代理实例
 */
const createVirtualResponse = (defaults: any, vTagId = uuid()): any => {
  if (defaults === nullValue) {
    defaults = newInstance(Null);
  } else if (defaults === undefinedValue) {
    defaults = newInstance(Undefined);
  } else if (!instanceOf(defaults, Undefined) && !instanceOf(defaults, Null) && !defaults[symbolVirtualTag]) {
    defaults = isObject(defaults) ? defaults : newInstance(ObjectCls, defaults);
    const getter = (key: string) => vTagCollectGetter((thisObj: any) => thisObj.__proto__[key].call(thisObj));
    defineProperties(
      defaults,
      {
        [symbolVirtualTag]: vTagId,
        [symbolToPrimitive]: getter(strValueOf),
        [strValueOf]: getter(strValueOf),
        [strToString]: getter(strToString)
      },
      trueValue
    );
  }

  return newInstance(Proxy, defaults, {
    get(target: any, key): any {
      // 判断是否为proxy实例
      if (key === symbolIsProxy) {
        return trueValue;
      }
      let subTargetValue = target[key];
      // 获取虚拟标签id、或放在promise中返回时直接返回数据
      if (includes([symbolVirtualTag, 'then'], key)) {
        return subTargetValue;
      }
      const valueIsFn = isFn(subTargetValue);
      if (globalVirtualResponseLock.v === 2) {
        if (instanceOf(target, Undefined) || instanceOf(target, Null)) {
          return includes([symbolToPrimitive, symbolVirtualTag], key) ? subTargetValue : valueOf(target)[key];
        }
        vTagCollectUnified(subTargetValue);
        subTargetValue = valueOf(subTargetValue);
      } else if (globalVirtualResponseLock.v === 0 && !valueIsFn && !subTargetValue?.[symbolIsProxy]) {
        // 判断是否已经是代理对象，是的话不创建代理对象
        subTargetValue = target[key] = createVirtualResponse(subTargetValue);
      }
      return valueIsFn ? subTargetValue.bind(target) : subTargetValue;
    }
  });
};

export default createVirtualResponse;
