import { defineProperties, includes, instanceOf, isFn, isObject, newInstance, uuid } from '../../../helper';
import {
	nullValue,
	ObjectCls,
	strToString,
	strValueOf,
	symbolToPrimitive,
	trueValue,
	undefinedValue
} from '../../../helper/variables';
import { globalVirtualResponseLock } from '../globalVariables';
import { vTagCollectGetter, vTagCollectUnified } from './helper';
import Null from './Null';
import Undefined from './Undefined';
import valueOf from './valueOf';
import { symbolVirtualTag } from './variables';

const symbolIsProxy = Symbol('isProxy');
/**
 * 创建虚拟标签
 * @returns 虚拟响应数据代理实例
 */
const createVirtualResponse = (defaults: any): any => {
	const transform2VirtualTag = (value: any) => {
		if (value === nullValue) {
			value = newInstance(Null);
		} else if (value === undefinedValue) {
			value = newInstance(Undefined);
		} else if (!instanceOf(value, Undefined) && !instanceOf(value, Null) && !value[symbolVirtualTag]) {
			value = isObject(value) ? value : newInstance(ObjectCls, value);
			const getter = (key: string) => vTagCollectGetter((thisObj: any) => thisObj.__proto__[key].call(thisObj));
			defineProperties(
				value,
				{
					[symbolVirtualTag]: uuid(),
					[symbolToPrimitive]: getter(strValueOf),
					[strValueOf]: getter(strValueOf),
					[strToString]: getter(strToString)
				},
				trueValue
			);
		}
		return value;
	};

	return newInstance(Proxy, transform2VirtualTag(defaults), {
		get(target: any, key): any {
			// 判断是否为proxy实例
			if (key === symbolIsProxy) {
				return trueValue;
			}

			let subTargetValue = target[key];
			const valueIsFn = isFn(subTargetValue);
			if (globalVirtualResponseLock.v) {
				if (instanceOf(target, Undefined) || instanceOf(target, Null)) {
					return includes([symbolToPrimitive, symbolVirtualTag], key) ? subTargetValue : valueOf(target)[key];
				}
				vTagCollectUnified(subTargetValue);
				subTargetValue = valueOf(subTargetValue);
			} else if (!valueIsFn && !subTargetValue?.[symbolIsProxy]) {
				// 判断是否已经是代理对象，是的话不创建代理对象
				subTargetValue = target[key] = createVirtualResponse(subTargetValue);
			}
			return valueIsFn ? subTargetValue.bind(target) : subTargetValue;
		}
	});
};

export default createVirtualResponse;
