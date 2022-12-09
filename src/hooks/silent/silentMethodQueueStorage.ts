import { isArray } from '@vue/shared';
import { Method } from 'alova';
import { SilentFactoryBootOptions } from '../../../typings';
import { forEach, JSONParse, JSONStringify, len, objectKeys, pushItem } from '../../helper';
import { trueValue, undefinedValue } from '../../helper/variables';
import dateSerializer from './serializer/date';
import regexpSerializer from './serializer/regexp';
import { dependentAlovaInstance } from './silentFactory';
import { SerializedSilentMethod, SilentMethod } from './SilentMethod';
import { SilentQueueMap } from './silentQueue';

type SilentMethodSerializerMap = NonNullable<SilentFactoryBootOptions['serializer']>;
let serializers: SilentMethodSerializerMap = {
	date: dateSerializer,
	regexp: regexpSerializer
};
const { storage } = dependentAlovaInstance;
const silentMethodIdQueueMapStorageKey = 'alova.SQ'; // silentMethod实例id组成的队列集合缓存key
const silentMethodStorageKeyPrefix = 'alova.SM.'; // silentMethod实例缓存key前缀

/**
 *
 * @param serializers
 */
export const mergeSerializer = (customSerializers: SilentMethodSerializerMap = {}) => {
	serializers = {
		...serializers,
		...customSerializers
	};
};

/**
 * 序列化静默方法实例
 * 如果序列化值有被转换，它将记录转换的序列化器名字供反序列化时使用
 * @param silentMethodInstance 请求方法实例
 * @returns 请求方法的序列化实例
 */
export const serializeSilentMethod = <S, E, R, T, RC, RE, RH>(
	silentMethodInstance: SilentMethod<S, E, R, T, RC, RE, RH>
) =>
	JSONStringify(silentMethodInstance, (_, value) => {
		let finallyApplySerializer = undefinedValue as string | undefined;
		value = objectKeys(serializers).reduce((currentValue, serializerName) => {
			const serializedValue = serializers[serializerName].forward(currentValue);
			if (serializedValue !== undefinedValue) {
				finallyApplySerializer = serializerName;
				currentValue = serializedValue;
			}
			return currentValue;
		}, value);
		return finallyApplySerializer !== undefinedValue ? [finallyApplySerializer, value] : value;
	});

/**
 * 反序列化silentMethod实例，根据序列化器的名称进行反序列化
 * @param methodInstance 请求方法实例
 * @returns 请求方法实例
 */
export const deserializeSilentMethod = (serializedSilentMethodString: string) => {
	const { id, behavior, entity, retry, interval, nextRound, targetRefMethod }: SerializedSilentMethod = JSONParse(
		serializedSilentMethodString,
		(_, value) => {
			if (isArray(value) && len(value) === 2) {
				const foundSerializer = serializers[value[0]];
				value = foundSerializer ? foundSerializer.backward(value[1]) : value;
			}
			return value;
		}
	);

	// method类实例化
	const deserializeMethod = (methodPayload: SerializedSilentMethod['entity']) => {
		const { type, url, config, requestBody } = methodPayload;
		return new Method(type, dependentAlovaInstance, url, config, requestBody);
	};
	const silentMethodInstance = new SilentMethod(
		deserializeMethod(entity),
		trueValue,
		behavior,
		id,
		retry,
		interval,
		nextRound
	);
	// targetRefMethod反序列化
	if (targetRefMethod) {
		silentMethodInstance.targetRefMethod = deserializeMethod(targetRefMethod);
	}

	return silentMethodInstance;
};

/**
 * 序列化并保存silentMethod实例
 * @param silentMethodInstance silentMethod实例
 */
export const persistSilentMethod = <S, E, R, T, RC, RE, RH>(
	silentMethodInstance: SilentMethod<S, E, R, T, RC, RE, RH>
) => {
	const silentMethodId = silentMethodInstance.id;
	const silentMethodStorageKey = silentMethodStorageKeyPrefix + silentMethodId;
	storage.setItem(silentMethodStorageKey, serializeSilentMethod(silentMethodInstance));
};

type SerializedSilentMethodIdQueueMap = Record<string, string[]>;
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
		storage.getItem(silentMethodIdQueueMapStorageKey) || '{}'
	) as SerializedSilentMethodIdQueueMap;
	const currentQueue = (silentMethodIdQueueMap[queueName] = silentMethodIdQueueMap[queueName] || []);
	pushItem(currentQueue, silentMethodInstance.id);
	storage.setItem(silentMethodIdQueueMapStorageKey, JSONStringify(silentMethodIdQueueMap));
};

/**
 * 移除静默方法实例
 * @param index 移除的索引
 * @param queue 操作的队列名
 */
export const removeSilentMethod = (index: number, queueName: string) => {
	// 将silentMethod实例id从queue中移除
	const silentMethodIdQueueMap = JSONParse(
		storage.getItem(silentMethodIdQueueMapStorageKey) || '{}'
	) as SerializedSilentMethodIdQueueMap;
	const currentQueue = silentMethodIdQueueMap[queueName];
	if (currentQueue && index >= 0 && index < len(currentQueue)) {
		currentQueue.splice(index, 1);
		storage.setItem(silentMethodIdQueueMapStorageKey, JSONStringify(silentMethodIdQueueMap));
	}
};

/**
 * 从storage中载入静默队列数据
 * @returns 所有队列数据
 */
export const loadSilentQueueMap = () => {
	const silentMethodIdQueueMap = JSONParse(
		storage.getItem(silentMethodIdQueueMapStorageKey) || '{}'
	) as SerializedSilentMethodIdQueueMap;
	const silentQueueMap = {} as SilentQueueMap;
	forEach(objectKeys(silentMethodIdQueueMap), queueName => {
		const currentQueue = (silentQueueMap[queueName] = silentQueueMap[queueName] || []);
		forEach(silentMethodIdQueueMap[queueName], silentMethodId => {
			const serializedSilentMethodString = storage.getItem(silentMethodStorageKeyPrefix + silentMethodId);
			serializedSilentMethodString && pushItem(currentQueue, deserializeSilentMethod(serializedSilentMethodString));
		});
	});
	return silentQueueMap;
};
