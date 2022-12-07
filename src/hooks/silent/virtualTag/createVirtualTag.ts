import { includes, uuid } from '../../../helper';
import { nullValue, symbolToPrimitive } from '../../../helper/variables';
import { symbolVirtualTag } from './auxiliary';
import Null from './Null';
import Undefined from './Undefined';

/**
 * 创建代理实例，包装类不支持Symbol数据类型，因为symbol没有包装类
 * @param target 代理目标实例
 * @returns 代理实例
 */
const proxify = (target: InstanceType<typeof Null | typeof Undefined>, actualValue?: any) =>
	new Proxy(target, {
		get(target, key) {
			return includes([Symbol.toPrimitive, 'typeof', 'valueOf'], key)
				? target[key as keyof typeof target]
				: actualValue[key];
		}
	});

export const createNullWrapper = () => proxify(new Null());
export const createUndefinedWrapper = () => proxify(new Undefined());

/**
 * 创建虚拟标签
 * @returns 虚拟响应数据代理实例
 */
const createVirtualTag = (locked: { v: boolean }, defaults: any = createUndefinedWrapper()) =>
	new Proxy(defaults, {
		get(target, key): any {
			if (locked.v) {
				return target[key];
			}
			let subTargetValue = defaults && defaults[key] ? defaults[key] : createUndefinedWrapper();
			if (typeof subTargetValue !== 'object') {
				subTargetValue = new Object(subTargetValue);
				subTargetValue[symbolVirtualTag] = uuid();
				subTargetValue[symbolToPrimitive] = function () {
					return this.valueOf();
				};
			} else if (subTargetValue === nullValue) {
				subTargetValue = createNullWrapper();
			}
			defaults[key] = subTargetValue;
			return createVirtualTag(subTargetValue, locked);
		}
	});

export default createVirtualTag;
