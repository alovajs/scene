import { defineProperties, includes, isObject, uuid } from '../../../helper';
import {
	nullValue,
	ObjectCls,
	strToString,
	strValueOf,
	symbolToPrimitive,
	undefinedValue
} from '../../../helper/variables';
import { symbolVirtualTag, vTagCollectUnified } from './auxiliary';
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

export const createNullWrapper = (vTagId?: string) => proxify(new Null(vTagId));
export const createUndefinedWrapper = (vTagId?: string) => proxify(new Undefined(vTagId));

/**
 * 创建虚拟标签
 * @returns 虚拟响应数据代理实例
 */
const createVirtualTag = (locked: { v: boolean }, defaults: any) => {
	const transform2VirtualTag = (value: any) => {
		const tagValue = () =>
			defineProperties(value, {
				[symbolVirtualTag]: uuid(),
				[symbolToPrimitive]: vTagCollectUnified((thisObj: any) => thisObj.__proto__[strValueOf]()),
				[strValueOf]: vTagCollectUnified((thisObj: any) => thisObj.__proto__[strValueOf]()),
				[strToString]: vTagCollectUnified((thisObj: any) => thisObj.__proto__[strToString]())
			});

		if (value === nullValue) {
			value = createNullWrapper();
		} else if (value === undefinedValue) {
			value = createUndefinedWrapper();
		} else {
			value = isObject(value) ? value : new ObjectCls(value);
			tagValue();
		}
		return value;
	};

	return new Proxy(transform2VirtualTag(defaults), {
		get(target, key): any {
			if (locked.v) {
				return vTagCollectUnified(target[key])();
			}
			let subTargetValue = transform2VirtualTag(defaults ?? defaults[key]);
			defaults[key] = subTargetValue;
			return createVirtualTag(subTargetValue, locked);
		}
	});
};

export default createVirtualTag;
