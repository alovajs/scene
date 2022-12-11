import { Method } from 'alova';
import { isArray, JSONParse, len, newInstance } from '../../../helper';
import { trueValue } from '../../../helper/variables';
import { dependentAlovaInstance } from '../globalVariables';
import { serializers } from '../serializer';
import { SerializedSilentMethod, SilentMethod } from '../SilentMethod';

/**
 * 反序列化silentMethod实例，根据序列化器的名称进行反序列化
 * @param methodInstance 请求方法实例
 * @returns 请求方法实例
 */
export default (serializedSilentMethodString: string) => {
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
		return newInstance(Method, type, dependentAlovaInstance, url, config, requestBody);
	};
	const silentMethodInstance = newInstance(
		SilentMethod,
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
