import { defineProperties, includes, instanceOf, isFn, isObject, newInstance, uuid } from '../../../helper';
import {
  falseValue,
  nullValue,
  ObjectCls,
  strToString,
  strValueOf,
  symbolToPrimitive,
  symbolToStringTag,
  trueValue,
  undefinedValue
} from '../../../helper/variables';
import { globalVirtualResponseLock } from '../globalVariables';
import { vTagCollectGetter } from './helper';
import Null from './Null';
import Undefined from './Undefined';
import { symbolIsProxy, symbolOriginalValue, symbolVirtualTag } from './variables';
import vtagDhy, { vtagDehydrateUnified } from './vtagDhy';

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
      // 获取原始值
      if (key === symbolOriginalValue) {
        return target;
      }
      // 将method实例序列化成字符串时触发
      // 此时返回该值的原始值
      // TODO: 在序列化method和silentMethod时，应该返回什么值？？？
      if (key === 'toJSON') {
        return vtagDehydrateUnified(target, falseValue);
      }

      let subTargetValue = target[key];
      // 获取虚拟标签id、或放在promise中返回时直接返回数据
      if (
        includes(
          [
            symbolVirtualTag, // 获取虚拟标签id时触发
            'then', // 包裹在promise中时触发
            // 以下为vue3转转换为ref值时触发
            '__v_isRef',
            '__v_isShallow',
            '__v_raw',
            '__v_isReadonly',
            '__v_skip',
            symbolToStringTag
          ],
          key
        )
      ) {
        return subTargetValue;
      }
      const valueIsFn = isFn(subTargetValue);
      if (globalVirtualResponseLock.v === 2) {
        if (instanceOf(target, Undefined) || instanceOf(target, Null)) {
          return includes([symbolToPrimitive, symbolVirtualTag], key) ? subTargetValue : vtagDhy(target)[key];
        }
        subTargetValue = vtagDehydrateUnified(subTargetValue, trueValue);
      } else if (globalVirtualResponseLock.v === 0 && !valueIsFn && !subTargetValue?.[symbolIsProxy]) {
        // 判断是否已经是代理对象，是的话不创建代理对象
        subTargetValue = target[key] = createVirtualResponse(subTargetValue);
      }
      return valueIsFn ? subTargetValue.bind(target) : subTargetValue;
    }
  });
};

export default createVirtualResponse;
