import { Method } from 'alova';
import { forEach, includes, isArray, isObject, JSONParse, len, newInstance, objectKeys } from '../../../helper';
import { trueValue, undefinedValue } from '../../../helper/variables';
import { dependentAlovaInstance } from '../globalVariables';
import { serializers } from '../serializer';
import { SerializedSilentMethod, SilentMethod } from '../SilentMethod';
import createVirtualResponse from '../virtualTag/createVirtualResponse';
import { vtagKey, vtagValueKey } from './helper';

/**
 * 反序列化silentMethod实例，根据序列化器的名称进行反序列化
 * @param methodInstance 请求方法实例
 * @returns 请求方法实例
 */
export default (serializedSilentMethodString: string) =>
  JSONParse(serializedSilentMethodString, (_, value) => {
    if (isArray(value) && len(value) === 2) {
      const foundSerializer = serializers[value[0]];
      value = foundSerializer ? foundSerializer.backward(value[1]) : value;
    }

    // 将虚拟标签格式转换回虚拟标签实例
    if (isObject(value) && value?.[vtagKey]) {
      const virtualTagId = value[vtagKey];
      const virtualTagValue = createVirtualResponse(value[vtagValueKey], virtualTagId);
      forEach(objectKeys(value), key => {
        if (!includes([vtagKey, vtagValueKey], key)) {
          virtualTagValue[key] = value[key];
        }
      });
      value = virtualTagValue;
    }
    return value;
  });

/**
 * 将反序列化的silentMethod载荷数据转换为silentMethod实例
 * @param payload 反序列化的silentMethod实例载荷数据
 * @returns silentMethod实例
 */
export const deserializedPayload2SilentMethodInstance = (payload: SerializedSilentMethod) => {
  const {
    id,
    behavior,
    entity,
    retryError,
    maxRetryTimes,
    backoff,
    fallbackHandlers,
    resolveHandler,
    rejectHandler,
    virtualResponse,
    methodHandler,
    handlerArgs,
    vTags,
    targetRefMethod,
    updateStates
  } = payload;

  // method类实例化
  const deserializeMethod = (methodPayload: SerializedSilentMethod['entity']) => {
    const { type, url, config, requestBody } = methodPayload;
    return newInstance(Method, type, dependentAlovaInstance, url, config, requestBody);
  };
  const silentMethodInstance = newInstance(
    SilentMethod,
    deserializeMethod(entity),
    behavior,
    methodHandler,
    id,
    retryError,
    maxRetryTimes,
    backoff,
    fallbackHandlers,
    resolveHandler,
    rejectHandler,
    handlerArgs,
    undefinedValue,
    vTags
  );
  silentMethodInstance.cache = trueValue;
  silentMethodInstance.virtualResponse = virtualResponse;

  // targetRefMethod反序列化
  if (targetRefMethod) {
    silentMethodInstance.targetRefMethod = deserializeMethod(targetRefMethod);
    silentMethodInstance.updateStates = updateStates;
  }
  return silentMethodInstance;
};
