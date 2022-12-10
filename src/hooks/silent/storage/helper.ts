import { dependentAlovaInstance } from '../globalVariables';

export const silentMethodIdQueueMapStorageKey = 'alova.SQ'; // silentMethod实例id组成的队列集合缓存key
export const silentMethodStorageKeyPrefix = 'alova.SM.'; // silentMethod实例缓存key前缀
export const storageSetItem = (key: string, value: string) => dependentAlovaInstance.storage.setItem(key, value);
export const storageGetItem = (key: string) => dependentAlovaInstance.storage.getItem(key);
export const storageRemoveItem = (key: string) => dependentAlovaInstance.storage.removeItem(key);

export type SerializedSilentMethodIdQueueMap = Record<string, string[]>;
