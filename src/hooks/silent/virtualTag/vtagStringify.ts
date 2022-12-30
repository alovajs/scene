import { undefinedValue } from '../../../helper/variables';
import { vTagCollectUnified } from './helper';
import { symbolVTagId } from './variables';

/**
 * 虚拟标签字符串化，如果参数不是虚拟标签则返回原数据
 * @param target 虚拟标签
 * @param returnOriginalIfNotVtag 如果不是虚拟标签则返回原值
 * @returns 虚拟标签id或原数据
 */
export default (target: any, returnOriginalIfNotVtag = true) => {
  vTagCollectUnified(target);
  const virtualTagIdRaw = target?.[symbolVTagId];
  const virtualTagId = virtualTagIdRaw ? `[vtag:${virtualTagIdRaw}]` : undefinedValue;
  return virtualTagId || (returnOriginalIfNotVtag ? target : undefinedValue);
};
