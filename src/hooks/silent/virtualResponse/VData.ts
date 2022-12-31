import { defineProperty, uuid, valueObject } from '../../../helper';
import { nullValue, ObjectCls, strToString, strValueOf, symbolToPrimitive, trueValue } from '../../../helper/variables';
import { vDataCollectGetter } from './helper';
import { symbolOriginalValue, symbolVDataId } from './variables';

interface VDataConstructor {
  new (originalValue: any, vDataId?: string): VDataInterface;
}
export interface VDataInterface {
  [x: string | symbol]: any;
}

/**
 * 虚拟数据类实现
 */
const VData = function (this: VDataInterface, originalValue: any, vDataId = uuid()) {
  defineProperty(this, symbolVDataId, vDataId);
  defineProperty(this, symbolOriginalValue, originalValue, trueValue);
} as unknown as VDataConstructor;
const getter = (key: string) => vDataCollectGetter((thisObj: any) => thisObj.__proto__[key].call(thisObj));
VData.prototype = ObjectCls.create(nullValue, {
  [symbolToPrimitive]: valueObject(
    vDataCollectGetter((thisObj: VDataInterface, hint: 'string' | 'number' | 'default') => {
      const originalValue = thisObj[symbolOriginalValue];
      return originalValue === nullValue && hint === 'string' ? '' : originalValue;
    })
  ),
  [strValueOf]: valueObject(getter(strValueOf)),
  [strToString]: valueObject(getter(strToString))
});

export default VData;
