import { defineProperty, uuid, valueObject } from '../../../helper';
import { nullValue, symbolToPrimitive } from '../../../helper/variables';
import { vTagCollectGetter } from './helper';
import { symbolVTagId } from './variables';

interface NullConstructor {
  new (vTagId?: string): NullInterface;
}
interface NullInterface {
  [x: symbol | string]: any;
}

/**
 * Null包装类实现
 */
const Null = function (this: NullInterface, vTagId = uuid()) {
  defineProperty(this, symbolVTagId, vTagId);
} as unknown as NullConstructor;
Null.prototype = Object.create(nullValue, {
  [symbolToPrimitive]: valueObject(
    vTagCollectGetter((_: any, hint: 'number' | 'string' | 'default') => (hint === 'string' ? '' : null))
  )
});

export default Null;
