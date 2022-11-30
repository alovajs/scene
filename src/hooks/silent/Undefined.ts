import { valueObject } from '../../helper';
import { nullValue, undefinedValue } from '../../helper/variables';
import { virtualTagSymbol } from './silentFactory';

interface UndefinedConstructor {
	new (): UndefinedInterface;
}
interface UndefinedInterface {
	[x: symbol]: true;
}

/**
 * Undefined包装类实现
 */
const Undefined = function () {} as unknown as UndefinedConstructor;
Undefined.prototype = Object.create(nullValue, {
	[virtualTagSymbol]: valueObject(true),
	[Symbol.toPrimitive]: valueObject((hint: 'number' | 'string' | 'default') => {
		return undefinedValue;
	}),
	valueOf: valueObject(() => undefinedValue)
});

export default Undefined;
