import { defineProperties, uuid, valueObject } from '../../../helper';
import { nullValue, symbolToPrimitive, undefinedValue } from '../../../helper/variables';
import { VirtualResponseLocked } from './createVirtualResponse';
import { proxify, vTagCollectUnified } from './helper';
import { symbolVirtualTag } from './variables';

interface UndefinedConstructor {
	new (vTagId?: string): UndefinedInterface;
}
interface UndefinedInterface {
	[x: symbol]: any;
}

/**
 * Undefined包装类实现
 */
export const Undefined = function (this: UndefinedInterface, vTagId = uuid()) {
	defineProperties(this, {
		[symbolVirtualTag]: vTagId
	});
} as unknown as UndefinedConstructor;
Undefined.prototype = Object.create(nullValue, {
	[symbolToPrimitive]: valueObject(vTagCollectUnified(undefinedValue))
});

export const createUndefinedWrapper = (locked: VirtualResponseLocked, vTagId?: string) =>
	proxify(new Undefined(vTagId), locked);
