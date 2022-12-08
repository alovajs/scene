import { isString } from '@vue/shared';
import { forEach, includes, instanceOf, isFn, isObject, objectKeys, pushItem, walkObject } from '../../../helper';
import { falseValue, nullValue, trueValue, undefinedValue } from '../../../helper/variables';
import { vtagIdCollectBasket } from '../createSilentQueueMiddlewares';
import { persistSilentMethod } from '../silentMethodQueueStorage';
import { silentMethodQueueMap } from '../silentQueue';
import Null from './Null';
import Undefined from './Undefined';

export const symbolVirtualTag = Symbol('vtag');
export const regVirtualTag = /\[vtag([0-9a-z]+)\]/g;

/** 辅助函数 */
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
 * 获取带虚拟标签变量的原始值
 * 如果是带虚拟标签的基本类型包装类（包含自定义的Null和Undefined），将返回原始值
 * 否则返回target本身
 *
 * 此函数也将会进行vTag收集
 * @param target 目标值
 * @returns 具有原始类型的目标值
 */
export const valueOf = (target: any) => {
	if (instanceOf(target, Undefined)) {
		target = undefinedValue;
	} else if (instanceOf(target, Null)) {
		target = nullValue;
	} else if (target && includes([Number, String, Boolean], target.constructor) && target[symbolVirtualTag]) {
		target = target.valueOf();
	}
	return vTagCollectUnified(target);
};

/**
 * 获取虚拟标签id
 * @param target 虚拟标签
 * @returns 虚拟标签id
 */
export const stringVirtualTag = (target: any) =>
	isObject(target) ? `[vtag${target[symbolVirtualTag]}]` : undefinedValue;

/**
 * 解析响应数据
 * @param response 真实响应数据
 * @param virtualResponse 虚拟响应数据
 * @returns 虚拟标签id所构成的对应真实数据集合
 */
export const parseResponseWithVirtualResponse = (response: any, virtualResponse: any) => {
	let replacedResponseMap = {} as Record<string, any>;
	let virtualTagId = stringVirtualTag(response);
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
 * 替换带有虚拟标签的method实例
 * 当它有methodHandler时调用它重新生成
 * @param virtualTagReplacedResponseMap 虚拟id和对应真实数据的集合
 */
export const replaceVirtualMethod = (virtualTagReplacedResponseMap: Record<string, any>) => {
	forEach(objectKeys(silentMethodQueueMap), queueName => {
		const currentQueue = silentMethodQueueMap[queueName];
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
				walkObject(silentMethodItem.entity, value => {
					const virtualTagId = stringVirtualTag(value);
					const newValue = virtualTagId
						? virtualTagReplacedResponseMap[virtualTagId]
						: isString(value)
						? value.replace(regVirtualTag, (_, rep) => virtualTagReplacedResponseMap[rep])
						: value;
					if (!methodUpdated && newValue !== value) {
						methodUpdated = trueValue;
					}
					return newValue;
				});
			}

			// 如果method实例有更新，则重新持久化此silentMethod实例
			methodUpdated && persistSilentMethod(silentMethodItem);
		});
	});
};
