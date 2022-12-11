import { undefinedValue } from '../../../helper/variables';
import { symbolVirtualTag } from './variables';

/**
 * 虚拟标签字符串化，如果参数不是虚拟标签则返回原数据
 * @param target 虚拟标签
 * @returns 虚拟标签id或原数据
 */
export default (target: any) => {
	const virtualTagId = target?.[symbolVirtualTag] ? `[vtag:${target[symbolVirtualTag]}]` : undefinedValue;
	return virtualTagId || target;
};
