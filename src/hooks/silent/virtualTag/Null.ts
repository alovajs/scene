import { defineProperties, uuid, valueObject } from '../../../helper';
import { nullValue, symbolToPrimitive } from '../../../helper/variables';
import { symbolVirtualTag, vTagCollectUnified } from './helper';

interface NullConstructor {
	new (vTagId?: string): NullInterface;
}
interface NullInterface {
	[x: symbol]: any;
}

/**
 * Null包装类实现
 */
const Null = function (this: NullInterface, vTagId = uuid()) {
	defineProperties(this, {
		[symbolVirtualTag]: vTagId
	});
} as unknown as NullConstructor;
Null.prototype = Object.create(nullValue, {
	[symbolVirtualTag]: valueObject(uuid()),
	[symbolToPrimitive]: valueObject(
		vTagCollectUnified((_: any, hint: 'number' | 'string' | 'default') => (hint === 'string' ? '' : null))
	)
});

export default Null;
