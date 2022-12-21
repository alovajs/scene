import { dependentAlovaInstance } from '../globalVariables';

export type SerializedSilentMethodIdQueueMap = Record<string, string[]>;

export const silentMethodIdQueueMapStorageKey = 'alova.SQ', // silentMethod实例id组成的队列集合缓存key
	silentMethodStorageKeyPrefix = 'alova.SM.', // silentMethod实例缓存key前缀
	vtagKey = '__$k',
	vtagValueKey = '__$v',
	storageSetItem = (key: string, value: string) => {
		dependentAlovaInstance.storage.setItem(key, value);
	},
	storageGetItem = (key: string) => dependentAlovaInstance.storage.getItem(key),
	storageRemoveItem = (key: string) => dependentAlovaInstance.storage.removeItem(key);
