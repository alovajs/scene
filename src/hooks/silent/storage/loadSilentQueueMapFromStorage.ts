import { forEach, JSONParse, objectKeys, pushItem } from '../../../helper';
import { SilentQueueMap } from '../silentQueue';
import deserialize, { deserializedPayload2SilentMethodInstance } from './deserialize';
import {
  SerializedSilentMethodIdQueueMap,
  silentMethodIdQueueMapStorageKey,
  silentMethodStorageKeyPrefix,
  storageGetItem
} from './helper';

/**
 * 从storage中载入静默队列数据
 * @returns 所有队列数据
 */
export default () => {
  const silentMethodIdQueueMap = JSONParse(
    storageGetItem(silentMethodIdQueueMapStorageKey) || '{}'
  ) as SerializedSilentMethodIdQueueMap;
  const silentQueueMap = {} as SilentQueueMap;
  forEach(objectKeys(silentMethodIdQueueMap), queueName => {
    const currentQueue = (silentQueueMap[queueName] = silentQueueMap[queueName] || []);
    forEach(silentMethodIdQueueMap[queueName], silentMethodId => {
      const serializedSilentMethodString = storageGetItem(silentMethodStorageKeyPrefix + silentMethodId);
      serializedSilentMethodString &&
        pushItem(currentQueue, deserializedPayload2SilentMethodInstance(deserialize(serializedSilentMethodString)));
    });
  });
  return silentQueueMap;
};
