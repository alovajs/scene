import { getConfig, instanceOf } from '../../../helper';
import { defaultQueueName } from '../../../helper/variables';
import { SilentMethod } from '../SilentMethod';
import { silentQueueMap } from '../silentQueue';

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
