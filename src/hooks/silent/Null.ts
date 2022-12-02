import { valueObject } from '../../helper';
import { nullValue } from '../../helper/variables';
import { virtualTagSymbol } from './silentFactory';

interface NullConstructor {
	new (): NullInterface;
}
interface NullInterface {
	[x: symbol]: true;
}

/**
 * Null包装类实现
 */
const Null = function () {} as unknown as NullConstructor;
Null.prototype = Object.create(nullValue, {
	[virtualTagSymbol]: valueObject(true),
	[Symbol.toPrimitive]: valueObject((hint: 'number' | 'string' | 'default') => (hint === 'string' ? '' : null)),
	valueOf: valueObject(() => nullValue)
});

export default Null;
