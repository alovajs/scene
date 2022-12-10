import { isFn, isObject, isString, pushItem, walkObject } from '../../../helper';
import { falseValue, symbolToPrimitive, trueValue } from '../../../helper/variables';
import { vtagIdCollectBasket } from '../globalVariables';
import { VirtualResponseLocked } from './createVirtualResponse';
import { Null } from './Null';
import stringifyVtag from './stringifyVtag';
import { Undefined } from './Undefined';
import { regVirtualTag, symbolVirtualTag } from './variables';

/**
 * 统一的vTag收集函数
 * @param returnValue 返回值，如果是函数则调用它
 * @returns 收集函数
 */
export const vTagCollectUnified = (returnValue: any) =>
	function (this: any, arg?: any) {
		pushItem(vtagIdCollectBasket || [], this[symbolVirtualTag]);
		return isFn(returnValue) ? returnValue(this, arg) : returnValue;
	};

/**
 * 深层遍历目标数据，并将虚拟标签替换为实际数据
 * @param target 目标数据
 * @param vtagResponse 虚拟标签和实际数据的集合
 * @returns 是否有替换数据
 */
export const replaceVTag = (target: any, vtagResponse: Record<string, any>) => {
	let replaced = falseValue;
	const replaceCallback = (value: any) => {
		const virtualTagId = stringifyVtag(value);
		const newValue = virtualTagId
			? vtagResponse[virtualTagId]
			: isString(value)
			? value.replace(regVirtualTag, (_, rep) => vtagResponse[rep])
			: value;
		if (!replaced && newValue !== value) {
			replaced = trueValue;
		}
		return newValue;
	};

	if (isObject(target)) {
		walkObject(target, replaceCallback);
	} else {
		target = replaceCallback(target);
	}
	return {
		r: replaced,
		d: target
	};
};

/**
 * 创建代理实例用于包装Undefined和Null自定义包装类
 * @param target 代理目标实例
 * @returns 代理实例
 */
export const proxify = (
	target: InstanceType<typeof Null | typeof Undefined>,
	locked: VirtualResponseLocked,
	actualValue?: any
) =>
	new Proxy(target, {
		get(target, key) {
			return !locked.v || symbolToPrimitive === key ? target[key as keyof typeof target] : actualValue[key];
		}
	});
