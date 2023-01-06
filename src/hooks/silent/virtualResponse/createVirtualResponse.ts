import { defineProperty, isArray, isPlainOrCustomObject, newInstance, uuid, walkObject } from '../../../helper';
import {
  nullValue,
  ObjectCls,
  strToString,
  strValueOf,
  symbolToPrimitive,
  undefinedValue
} from '../../../helper/variables';
import { vDataGetter } from './helper';
import Null from './Null';
import Undefined from './Undefined';
import { symbolVDataId } from './variables';

/**
 * 创建虚拟响应数据
 * @returns 虚拟响应数据代理实例
 */
export default (structure: any, vDataId = uuid()) => {
  const transform2VData = (value: any, vDataIdInner = uuid()) => {
    if (value === nullValue) {
      value = newInstance(Null);
    } else if (value === undefinedValue) {
      value = newInstance(Undefined);
    } else {
      value = ObjectCls(value);
      defineProperty(value, symbolToPrimitive, vDataGetter(strValueOf));
      defineProperty(value, strValueOf, vDataGetter(strValueOf));
      defineProperty(value, strToString, vDataGetter(strToString));
    }
    defineProperty(value, symbolVDataId, vDataIdInner);
    return value;
  };

  const virtualResponse = transform2VData(structure, vDataId);
  if (isPlainOrCustomObject(virtualResponse) || isArray(virtualResponse)) {
    walkObject(virtualResponse, value => transform2VData(value));
  }
  return virtualResponse;
};
