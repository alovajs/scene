import { getConfig, instanceOf } from '../../../helper';
import { defaultQueueName, falseValue, trueValue, undefinedValue } from '../../../helper/variables';
import { SilentMethod } from '../SilentMethod';
import { silentQueueMap } from '../silentQueue';

/**
 * 按method名称或正则表达式筛选满足条件的所有silentMethod实例
 * @param methodNameMatcher method名称匹配器
 * @param queueName 查找队列名，默认为default队列
 * @param filterActive 是否过滤掉激活状态的实例
 * @returns silentMethod实例数组
 */
export const filterSilentMethods = (
  methodNameMatcher?: string | number | RegExp,
  queueName = defaultQueueName,
  filterActive = falseValue
) =>
  (silentQueueMap[queueName] || []).filter(silentMethodItem => {
    if (methodNameMatcher === undefinedValue) {
      return trueValue;
    }
    const name = getConfig(silentMethodItem.entity).name || '';
    const retain = instanceOf(methodNameMatcher, RegExp) ? methodNameMatcher.test(name) : name === methodNameMatcher;
    return retain && (filterActive ? silentMethodItem.active : trueValue);
  });

/**
 * 按method名称或正则表达式查找第一个满足条件的silentMethod实例
 * @param methodNameMatcher method名称匹配器
 * @param queueName 查找队列名，默认为default队列
 * @param filterActive 是否过滤掉激活状态的实例
 * @returns silentMethod实例，未找到时为undefined
 */
export const getSilentMethod = (
  methodNameMatcher?: string | number | RegExp,
  queueName = defaultQueueName,
  filterActive = falseValue
): SilentMethod | undefined => filterSilentMethods(methodNameMatcher, queueName, filterActive)[0];
