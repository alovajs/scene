import { JSONParse, JSONStringify, len, pushItem, splice } from '../../../helper';
import { SilentMethod } from '../SilentMethod';
import {
  SerializedSilentMethodIdQueueMap,
  silentMethodIdQueueMapStorageKey,
  silentMethodStorageKeyPrefix,
  storageGetItem,
  storageRemoveItem,
  storageSetItem
} from './helper';
import serializeSilentMethod from './serializeSilentMethod';

/**
 * 序列化并保存silentMethod实例
 * @param silentMethodInstance silentMethod实例
 */
export const persistSilentMethod = <S, E, R, T, RC, RE, RH>(
  silentMethodInstance: SilentMethod<S, E, R, T, RC, RE, RH>
) => {
  const silentMethodId = silentMethodInstance.id;
  const silentMethodStorageKey = silentMethodStorageKeyPrefix + silentMethodId;
  storageSetItem(silentMethodStorageKey, serializeSilentMethod(silentMethodInstance));
};

/**
 * 将静默请求的配置信息放入对应storage中
 * 逻辑：通过构造一个key，并用这个key将静默方法的配置信息放入对应storage中，然后将key存入统一管理key的存储中
 * @param silentMethod SilentMethod实例
 * @param queue 操作的队列名
 */
export const push2PersistentSilentQueue = <S, E, R, T, RC, RE, RH>(
  silentMethodInstance: SilentMethod<S, E, R, T, RC, RE, RH>,
  queueName: string
) => {
  persistSilentMethod(silentMethodInstance);
  // 将silentMethod实例id保存到queue存储中
  const silentMethodIdQueueMap = JSONParse(
    storageGetItem(silentMethodIdQueueMapStorageKey) || '{}'
  ) as SerializedSilentMethodIdQueueMap;
  const currentQueue = (silentMethodIdQueueMap[queueName] = silentMethodIdQueueMap[queueName] || []);
  pushItem(currentQueue, silentMethodInstance.id);
  storageSetItem(silentMethodIdQueueMapStorageKey, JSONStringify(silentMethodIdQueueMap));
};

/**
 * 移除静默方法实例
 * @param targetSilentMethodId 目标silentMethod实例id
 * @param queue 操作的队列名
 */
export const removeSilentMethod = (targetSilentMethodId: string, queueName: string) => {
  // 将silentMethod实例id从queue中移除
  const silentMethodIdQueueMap = JSONParse(
    storageGetItem(silentMethodIdQueueMapStorageKey) || '{}'
  ) as SerializedSilentMethodIdQueueMap;
  const currentQueue = silentMethodIdQueueMap[queueName];
  if (currentQueue) {
    const index = currentQueue.findIndex(id => id === targetSilentMethodId);
    if (index >= 0) {
      splice(currentQueue, index, 1);
      len(currentQueue) <= 0 && delete silentMethodIdQueueMap[queueName]; // 队列为空时删除此队列
      storageSetItem(silentMethodIdQueueMapStorageKey, JSONStringify(silentMethodIdQueueMap));
      storageRemoveItem(silentMethodStorageKeyPrefix + targetSilentMethodId);
    }
  }
};
