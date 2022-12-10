import { defineProperties, instanceOf, isObject, uuid } from '../../../helper';
import {
	nullValue,
	ObjectCls,
	strToString,
	strValueOf,
	symbolToPrimitive,
	undefinedValue
} from '../../../helper/variables';
import { vTagCollectUnified } from './helper';
import { createNullWrapper, Null } from './Null';
import { createUndefinedWrapper, Undefined } from './Undefined';
import { symbolVirtualTag } from './variables';

export interface VirtualResponseLocked {
	v: boolean;
}
/**
 * 创建虚拟标签
 * @returns 虚拟响应数据代理实例
 */
const createVirtualResponse = (defaults: any, locked: VirtualResponseLocked) => {
	const transform2VirtualTag = (value: any) => {
		if (value === nullValue) {
			value = createNullWrapper(locked);
		} else if (value === undefinedValue) {
			value = createUndefinedWrapper(locked);
		} else if (!instanceOf(value, Undefined) && !instanceOf(value, Null)) {
			value = isObject(value) ? value : new ObjectCls(value);
			defineProperties(value, {
				[symbolVirtualTag]: uuid(),
				[symbolToPrimitive]: vTagCollectUnified((thisObj: any) => thisObj.__proto__[strValueOf]()),
				[strValueOf]: vTagCollectUnified((thisObj: any) => thisObj.__proto__[strValueOf]()),
				[strToString]: vTagCollectUnified((thisObj: any) => thisObj.__proto__[strToString]())
			});
		}
		return value;
	};

	return new Proxy(transform2VirtualTag(defaults), {
		get(target, key): any {
			if (locked.v) {
				return vTagCollectUnified(target[key])();
			}
			const subTargetValue = transform2VirtualTag(defaults === undefinedValue ? undefinedValue : defaults[key]);
			defaults[key] = subTargetValue;
			// 判断是否已经是代理对象，是的话失效重新创建或不创建
			return createVirtualResponse(subTargetValue, locked);
		}
	});
};

export default createVirtualResponse;
