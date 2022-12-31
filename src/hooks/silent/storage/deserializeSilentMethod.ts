import { Method } from 'alova';
import { forEach, includes, isArray, isObject, JSONParse, len, newInstance, objectKeys } from '../../../helper';
import { trueValue } from '../../../helper/variables';
import { dependentAlovaInstance } from '../globalVariables';
import { serializers } from '../serializer';
import { SerializedSilentMethod, SilentMethod } from '../SilentMethod';
import createVirtualResponse from '../virtualResponse/createVirtualResponse';
import { vDataKey, vDataValueKey } from './helper';

/**
 * 反序列化silentMethod实例，根据序列化器的名称进行反序列化
 * @param methodInstance 请求方法实例
 * @returns 请求方法实例
 */
export default (serializedSilentMethodString: string) => {
  const payload: SerializedSilentMethod = JSONParse(serializedSilentMethodString, (_, value) => {
    if (isArray(value) && len(value) === 2) {
      const foundSerializer = serializers[value[0]];
      value = foundSerializer ? foundSerializer.backward(value[1]) : value;
    }

    // 将虚拟数据格式转换回虚拟数据实例
    if (isObject(value) && value?.[vDataKey]) {
      const vDataId = value[vDataKey];
      const vDataValue = createVirtualResponse(value[vDataValueKey], vDataId);
      forEach(objectKeys(value), key => {
        if (!includes([vDataKey, vDataValueKey], key)) {
          vDataValue[key] = value[key];
        }
      });
      value = vDataValue;
    }
    return value;
  });

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
    handlerArgs,
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
    id,
    retryError,
    maxRetryTimes,
    backoff,
    fallbackHandlers,
    resolveHandler,
    rejectHandler,
    handlerArgs
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
