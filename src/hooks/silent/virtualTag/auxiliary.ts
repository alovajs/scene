import { updateOptions, updateState } from 'alova';
import { SilentMethod } from '../../../../typings';
import { getConfig, includes, instanceOf, isFn, isObject, noop, objectKeys } from '../../../helper';
import { nullValue, undefinedValue } from '../../../helper/variables';
import { currentSilentMethod } from '../createSilentQueueMiddlewares';
import { defaultQueueName, silentQueueMap } from '../silentQueue';
import { symbolVirtualTag, vTagCollectUnified } from './helper';
import Null from './Null';
import Undefined from './Undefined';

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
 * 更新对应method的状态
 * 与updateState不同的是，除了立即更新状态外，它还会在silent模式下响应后再次更新一次，目的是将虚拟标签替换为实际数据
 * @param method 请求方法对象
 * @param handleUpdate 更新回调
 */
export const updateStateEffect: typeof updateState = (matcher, handleUpdate, options) => {
	const optionsUnified = (options || {}) as updateOptions;
	const onMatch = optionsUnified.onMatch;
	optionsUnified.onMatch = method => {
		// 将目标method实例保存到当前的silentMethod实例
		if (currentSilentMethod) {
			currentSilentMethod.targetRefMethod = method;
			currentSilentMethod.updateStates = isFn(updateState) ? ['data'] : objectKeys(updateState);
		}
		(onMatch || noop)(method);
	};
	return updateState(matcher, handleUpdate, optionsUnified);
};

/**
 * 按method名称或正则表达式筛选满足条件的所有silentMethod实例
 * @param methodNameMatcher method名称匹配器
 * @param queueName 查找队列名，默认为default队列
 * @returns silentMethod实例数组
 */
export const filterSilentMethods = (methodNameMatcher: string | RegExp, queueName = defaultQueueName) =>
	(silentQueueMap[queueName] || []).filter(silentMethodItem => {
		const name = getConfig(silentMethodItem.entity).name || '';
		return instanceOf(methodNameMatcher, RegExp) ? methodNameMatcher.test(name) : name === methodNameMatcher;
	});

/**
 * 按method名称或正则表达式查找第一个满足条件的silentMethod实例
 * @param methodNameMatcher method名称匹配器
 * @param queueName 查找队列名，默认为default队列
 * @returns silentMethod实例，未找到时为undefined
 */
export const getSilentMethod = (
	methodNameMatcher: string | RegExp,
	queueName = defaultQueueName
): SilentMethod | undefined => filterSilentMethods(methodNameMatcher, queueName)[0];

/**
 * 虚拟标签字符串化，如果参数不是虚拟标签则返回原数据
 * @param target 虚拟标签
 * @returns 虚拟标签id或原数据
 */
export const stringifyVtag = (target: any) => {
	const virtualTagId = isObject(target) ? `[vtag:${target[symbolVirtualTag]}]` : undefinedValue;
	return virtualTagId || target;
};
