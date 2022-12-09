import { isString } from '@vue/shared';
import { forEach, isFn, isObject, objectKeys, pushItem, walkObject } from '../../../helper';
import { falseValue, trueValue } from '../../../helper/variables';
import { vtagIdCollectBasket } from '../createSilentQueueMiddlewares';
import { persistSilentMethod } from '../silentMethodQueueStorage';
import { silentQueueMap } from '../silentQueue';
import { stringifyVtag } from './auxiliary';

export const symbolVirtualTag = Symbol('vtag');
export const regVirtualTag = /\[vtag:([0-9a-z]+)\]/g;

/**
 * 统一的vTag收集函数
 * @param returnValue 返回值，如果是函数则调用它
 * @returns 收集函数
 */
export const vTagCollectUnified = (returnValue: any) =>
	function (this: any, arg?: any) {
		let thisObj = this;
		pushItem(vtagIdCollectBasket || [], thisObj[symbolVirtualTag]);
		return isFn(returnValue) ? returnValue(thisObj, arg) : returnValue;
	};

/**
 * 解析响应数据
 * @param response 真实响应数据
 * @param virtualResponse 虚拟响应数据
 * @returns 虚拟标签id所构成的对应真实数据集合
 */
export const parseResponseWithVirtualResponse = (response: any, virtualResponse: any) => {
	let replacedResponseMap = {} as Record<string, any>;
	let virtualTagId = stringifyVtag(response);
	virtualTagId && (replacedResponseMap[virtualTagId] = response);

	if (isObject(virtualResponse)) {
		for (const i in virtualResponse) {
			replacedResponseMap = {
				...replacedResponseMap,
				...parseResponseWithVirtualResponse(response ?? response[i], virtualResponse[i])
			};
		}
	}
	return replacedResponseMap;
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
 * 替换带有虚拟标签的method实例
 * 当它有methodHandler时调用它重新生成
 * @param virtualTagReplacedResponseMap 虚拟id和对应真实数据的集合
 */
export const replaceVirtualMethod = (virtualTagReplacedResponseMap: Record<string, any>) => {
	forEach(objectKeys(silentQueueMap), queueName => {
		const currentQueue = silentQueueMap[queueName];
		forEach(currentQueue, silentMethodItem => {
			const handlerArgs = silentMethodItem.handlerArgs || [];
			forEach(handlerArgs, (arg, i) => {
				if (virtualTagReplacedResponseMap[arg]) {
					handlerArgs[i] = virtualTagReplacedResponseMap[arg];
				}
			});
			// 重新生成一个method实例并替换
			let methodUpdated = falseValue;
			if (silentMethodItem.methodHandler) {
				silentMethodItem.entity = silentMethodItem.methodHandler(...handlerArgs);
				methodUpdated = trueValue;
			} else {
				// 深层遍历entity对象，如果发现有虚拟标签或虚拟标签id，则替换为实际数据
				methodUpdated = replaceVTag(silentMethodItem.entity, virtualTagReplacedResponseMap).r;
			}

			// 如果method实例有更新，则重新持久化此silentMethod实例
			methodUpdated && persistSilentMethod(silentMethodItem);
		});
	});
};
