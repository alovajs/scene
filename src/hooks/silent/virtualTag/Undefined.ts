import { defineProperties, uuid, valueObject } from '../../../helper';
import { nullValue, symbolToPrimitive, undefinedValue } from '../../../helper/variables';
import { vTagCollectGetter } from './helper';
import { symbolVirtualTag } from './variables';

interface UndefinedConstructor {
  new (vTagId?: string): UndefinedInterface;
}
interface UndefinedInterface {
  [x: string | symbol]: any;
}

/**
 * Undefined包装类实现
 */
const Undefined = function (this: UndefinedInterface, vTagId = uuid()) {
  defineProperties(this, {
    [symbolVirtualTag]: vTagId
  });
} as unknown as UndefinedConstructor;
Undefined.prototype = Object.create(nullValue, {
  [symbolToPrimitive]: valueObject(vTagCollectGetter(undefinedValue))
});

export default Undefined;
