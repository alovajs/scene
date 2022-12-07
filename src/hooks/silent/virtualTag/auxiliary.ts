/** 辅助函数 */

import { includes, instanceOf } from '../../../helper';
import { nullValue, undefinedValue } from '../../../helper/variables';
import Null from './Null';
import Undefined from './Undefined';

export const symbolVirtualTag = Symbol('vtag');

/**
 * 获取带虚拟标签变量的原始值
 * 如果是带虚拟标签的基本类型包装类（包含自定义的Null和Undefined），将返回原始值
 * 否则返回target本身
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
	return target;
};
