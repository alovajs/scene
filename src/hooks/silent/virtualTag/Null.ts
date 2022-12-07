import { uuid, valueObject } from '../../../helper';
import { nullValue, symbolToPrimitive } from '../../../helper/variables';
import { symbolVirtualTag } from '../virtualTag/auxiliary';

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
	[symbolVirtualTag]: valueObject(uuid()),
	[symbolToPrimitive]: valueObject((hint: 'number' | 'string' | 'default') => (hint === 'string' ? '' : null)),
	valueOf: valueObject(() => nullValue)
});

export default Null;
