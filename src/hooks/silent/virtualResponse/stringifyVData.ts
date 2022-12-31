import { undefinedValue } from '../../../helper/variables';
import { vDataCollectUnified } from './helper';
import { symbolVDataId } from './variables';

/**
 * 虚拟数据字符串化，如果参数不是虚拟数据则返回原数据
 * @param target 虚拟数据
 * @param returnOriginalIfNotVData 如果不是虚拟数据则返回原值
 * @returns 虚拟数据id或原数据
 */
export default (target: any, returnOriginalIfNotVData = true) => {
  vDataCollectUnified(target);
  const vDataIdRaw = target?.[symbolVDataId];
  const vDataId = vDataIdRaw ? `[vd:${vDataIdRaw}]` : undefinedValue;
  return vDataId || (returnOriginalIfNotVData ? target : undefinedValue);
};
