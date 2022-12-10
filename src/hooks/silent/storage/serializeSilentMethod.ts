import { SilentMethod } from '../../../../typings';
import { JSONStringify, objectKeys } from '../../../helper';
import { undefinedValue } from '../../../helper/variables';
import { serializers } from '../serializer';

/**
 * 序列化静默方法实例
 * 如果序列化值有被转换，它将记录转换的序列化器名字供反序列化时使用
 * @param silentMethodInstance 请求方法实例
 * @returns 请求方法的序列化实例
 */
export default <S, E, R, T, RC, RE, RH>(silentMethodInstance: SilentMethod<S, E, R, T, RC, RE, RH>) =>
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
