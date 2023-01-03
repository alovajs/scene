import { dependentAlovaInstance, silentAssert } from '../globalVariables';

export type SerializedSilentMethodIdQueueMap = Record<string, string[]>;
const assertStorage = () => {
  silentAssert(!!dependentAlovaInstance, 'please set alova instance in `bootSilentFactory`');
};
export const silentMethodIdQueueMapStorageKey = 'alova.SQ', // silentMethod实例id组成的队列集合缓存key
  silentMethodStorageKeyPrefix = 'alova.SM.', // silentMethod实例缓存key前缀
  vDataKey = '__$k',
  vDataValueKey = '__$v',
  storageSetItem = (key: string, value: string) => {
    assertStorage();
    dependentAlovaInstance.storage.setItem(key, value);
  },
  storageGetItem = (key: string) => {
    assertStorage();
    return dependentAlovaInstance.storage.getItem(key);
  },
  storageRemoveItem = (key: string) => {
    assertStorage();
    dependentAlovaInstance.storage.removeItem(key);
  };
