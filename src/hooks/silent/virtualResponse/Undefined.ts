import { valueObject } from '../../../helper';
import {
  nullValue,
  ObjectCls,
  strToString,
  strValueOf,
  symbolToPrimitive,
  undefinedValue
} from '../../../helper/variables';
import { vDataCollectGetter, vDataGetter } from './helper';

interface UndefinedConstructor {
  new (vDataId?: string): UndefinedInterface;
}
interface UndefinedInterface {
  [x: string | symbol]: any;
}

/**
 * Undefined包装类实现
 */
const Undefined = function (this: UndefinedInterface) {} as unknown as UndefinedConstructor;
Undefined.prototype = ObjectCls.create(nullValue, {
  [symbolToPrimitive]: valueObject(vDataCollectGetter(() => undefinedValue)),
  [strValueOf]: valueObject(vDataGetter(strValueOf)),
  [strToString]: valueObject(vDataGetter(strToString))
});

export default Undefined;
