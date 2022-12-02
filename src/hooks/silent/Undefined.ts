import { valueObject } from '../../helper';
import { nullValue, undefinedValue } from '../../helper/variables';
import { virtualTagSymbol } from './virtualResponse';

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
	[virtualTagSymbol]: valueObject(true),
	[Symbol.toPrimitive]: valueObject(() => undefinedValue),
	valueOf: valueObject(() => undefinedValue)
});

export default Undefined;
