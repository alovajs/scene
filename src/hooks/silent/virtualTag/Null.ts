import { defineProperties, uuid, valueObject } from '../../../helper';
import { nullValue, symbolToPrimitive } from '../../../helper/variables';
import { VirtualResponseLocked } from './createVirtualResponse';
import { proxify, vTagCollectUnified } from './helper';
import { symbolVirtualTag } from './variables';

interface NullConstructor {
	new (vTagId?: string): NullInterface;
}
interface NullInterface {
	[x: symbol]: any;
}

/**
 * Null包装类实现
 */
export const Null = function (this: NullInterface, vTagId = uuid()) {
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

export const createNullWrapper = (locked: VirtualResponseLocked, vTagId?: string) =>
	proxify(new Null(vTagId), locked, nullValue);
