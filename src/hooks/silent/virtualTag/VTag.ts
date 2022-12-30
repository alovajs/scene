import { defineProperty, uuid, valueObject } from '../../../helper';
import { nullValue, ObjectCls, strToString, strValueOf, symbolToPrimitive, trueValue } from '../../../helper/variables';
import { vTagCollectGetter } from './helper';
import { symbolOriginalValue, symbolVTagId } from './variables';

interface VTagConstructor {
  new (originalValue: any, vTagId?: string): VTagInterface;
}
export interface VTagInterface {
  [x: string | symbol]: any;
}

/**
 * 虚拟标签类实现
 */
const VTag = function (this: VTagInterface, originalValue: any, vTagId = uuid()) {
  defineProperty(this, symbolVTagId, vTagId);
  defineProperty(this, symbolOriginalValue, originalValue, trueValue);
} as unknown as VTagConstructor;
const getter = (key: string) => vTagCollectGetter((thisObj: any) => thisObj.__proto__[key].call(thisObj));
VTag.prototype = ObjectCls.create(nullValue, {
  [symbolToPrimitive]: valueObject(
    vTagCollectGetter((thisObj: VTagInterface, hint: 'string' | 'number' | 'default') => {
      const originalValue = thisObj[symbolOriginalValue];
      return originalValue === nullValue && hint === 'string' ? '' : originalValue;
    })
  ),
  [strValueOf]: valueObject(getter(strValueOf)),
  [strToString]: valueObject(getter(strToString))
});

export default VTag;
