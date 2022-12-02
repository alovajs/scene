import { Method } from 'alova';
import { FallbackHandler, SilentMethodFilter } from '../../../typings';
import { getContext, JSONParse, JSONStringify, len, noop, objectKeys, pushItem } from '../../helper';
import { nullValue, undefinedValue } from '../../helper/variables';
import SilentMethod, { PromiseExecuteParameter } from './SilentMethod';

export const defaultQueueName = 'default';
/** 静默方法队列集合 */
export const silentMethodQueues = {} as Record<string, SilentMethod<any, any, any, any, any, any, any>[]>;

/** 正在请求的静默方法实例 */
let pendingSilentMethod: SilentMethod<any, any, any, any, any, any, any> | undefined = undefinedValue;

/**
 * 获取静默方法，根据静默方法实例匹配器格式，默认向default队列获取
 * @param matcher 静默方法实例匹配器
 */
export const getSilentMethods = (matcher: SilentMethodFilter, queue = defaultQueueName) => {};

/**
 * 序列化请求方法对象
 * @param methodInstance 请求方法对象
 * @returns 请求方法的序列化对象
 */
export const serializeMethod = <S, E, R, T, RC, RE, RH>(methodInstance: Method<S, E, R, T, RC, RE, RH>) => {
	const { type, url, config, requestBody } = methodInstance;
	return {
		type,
		url,
		config,
		requestBody
	};
};

/**
 * 反序列化请求方法对象
 * @param methodInstance 请求方法对象
 * @returns 请求方法对象
 */
export const deserializeMethod = <S, E, RC, RE, RH>(
	{ type, url, config, requestBody }: SerializedMethod<any, any, RC, RH>,
	alova: Alova<S, E, RC, RE, RH>
) => new Method<S, E, any, any, RC, RE, RH>(type, alova, url, config, requestBody);

const silentRequestStorageKeyPrefix = '__$$a_sreqssk$$__';

/**
 * 将静默请求的配置信息放入对应storage中
 * 逻辑：通过构造一个key，并用这个key将静默请求的配置信息放入对应storage中，然后将key存入统一管理key的存储中
 * @param namespace 命名空间，即alovaId
 * @param key 存储的key
 * @param config 存储的配置
 * @param storage 存储对象
 */
export const pushSilentRequest = (namespace: string, key: string, config: Record<string, any>, storage: Storage) => {
	const namespacedSilentStorageKey = silentRequestStorageKeyPrefix + namespace;
	key = '__$$sreq$$__' + namespace + key;
	storage.setItem(key, JSONStringify(config));
	const storageKeys = JSONParse(storage.getItem(namespacedSilentStorageKey) || '{}') as Record<string, null>;
	storageKeys[key] = nullValue;
	storage.setItem(namespacedSilentStorageKey, JSONStringify(storageKeys));
};

/**
 * 从storage中获取静默请求的配置信息
 * @param namespace 命名空间，即alovaId
 * @returns 返回一个对象，包含serializedMethod和remove方法
 */
export const getSilentRequest = (namespace: string, storage: Storage) => {
	const namespacedSilentStorageKey = silentRequestStorageKeyPrefix + namespace;
	const storageKeys = JSONParse(storage.getItem(namespacedSilentStorageKey) || '{}') as Record<string, null>;
	let serializedMethod = undefinedValue as SerializedMethod<any, any, any, any> | undefined;
	let remove = noop;
	const keys = objectKeys(storageKeys);
	if (len(keys) > 0) {
		const key = keys[0];
		const reqConfig = storage.getItem(key);
		serializedMethod = reqConfig ? JSONParse(reqConfig) : undefinedValue;
		remove = () => {
			delete storageKeys[key];
			storage.setItem(namespacedSilentStorageKey, JSONStringify(storageKeys));
			storage.removeItem(key);
		};
	}
	return { serializedMethod, remove };
};

/**
 * 持久化SilentMethod序列化数据
 * @param namespace 命名空间
 * @param key 存储的key
 * @param response 存储的响应内容
 * @param expireTimestamp 过期时间点的时间戳表示
 * @param storage 存储对象
 * @param tag 存储标签，用于区分不同的存储标记
 */
export const persistResponse = (
	namespace: string,
	key: string,
	response: any,
	expireTimestamp: number,
	storage: Storage,
	tag: string | undefined
) => {
	// 小于0则不持久化了
	if (expireTimestamp > 0 && response) {
		storage.setItem(
			buildNamespacedStorageKey(namespace, key),
			JSONStringify([response, expireTimestamp === Infinity ? nullValue : expireTimestamp, tag])
		);
	}
};

export const pushNewSilentMethod = <S, E, R, T, RC, RE, RH>(
	methodInstance: Method<S, E, R, T, RC, RE, RH>,
	fallbackHandlers: FallbackHandler[],
	retry?: number,
	interval?: number,
	nextRound?: number,
	resolveHandler?: PromiseExecuteParameter[0],
	rejectHandler?: PromiseExecuteParameter[1],
	queue = defaultQueueName
) => {
	const currentQueue = (silentMethodQueues[queue] = silentMethodQueues[queue] || []);

	// 如果没有绑定fallback事件回调，则持久化
	if (len(fallbackHandlers) <= 0) {
		const { storage } = getContext(methodInstance);
	}

	pushItem(
		currentQueue,
		new SilentMethod<S, E, R, T, RC, RE, RH>(
			methodInstance,
			retry,
			interval,
			nextRound,
			fallbackHandlers,
			resolveHandler,
			rejectHandler
		)
	);
};
