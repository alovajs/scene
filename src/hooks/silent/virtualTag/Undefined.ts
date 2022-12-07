import { uuid, valueObject } from '../../../helper';
import { nullValue, symbolToPrimitive, undefinedValue } from '../../../helper/variables';
import { symbolVirtualTag } from '../virtualTag/auxiliary';

interface UndefinedConstructor {
	new (): UndefinedInterface;
}
interface UndefinedInterface {
	[x: symbol]: true | undefined;
}

/**
 * Undefined包装类实现
 */
const Undefined = function () {} as unknown as UndefinedConstructor;
Undefined.prototype = Object.create(nullValue, {
	[symbolVirtualTag]: valueObject(uuid()),
	[symbolToPrimitive]: valueObject(() => undefinedValue),
	valueOf: valueObject(() => undefinedValue)
});

export default Undefined;