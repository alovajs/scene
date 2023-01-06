import { valueObject } from '../../../helper';
import { nullValue, ObjectCls, strToString, strValueOf, symbolToPrimitive } from '../../../helper/variables';
import { vDataCollectGetter, vDataGetter } from './helper';

interface NullConstructor {
  new (vDataId?: string): NullInterface;
}
interface NullInterface {
  [x: symbol | string]: any;
}

/**
 * Null包装类实现
 */
const Null = function (this: NullInterface) {} as unknown as NullConstructor;
Null.prototype = ObjectCls.create(nullValue, {
  [symbolToPrimitive]: valueObject(
    vDataCollectGetter((_: any, hint: 'number' | 'string' | 'default') => (hint === 'string' ? '' : null))
  ),
  [strValueOf]: valueObject(vDataGetter(strValueOf)),
  [strToString]: valueObject(vDataGetter(strToString))
});

export default Null;
