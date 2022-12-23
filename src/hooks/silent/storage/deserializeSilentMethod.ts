import { Method } from 'alova';
import { forEach, includes, isArray, isObject, JSONParse, len, newInstance, objectKeys } from '../../../helper';
import { nullValue, ObjectCls, trueValue, undefinedValue } from '../../../helper/variables';
import { dependentAlovaInstance } from '../globalVariables';
import { serializers } from '../serializer';
import { SerializedSilentMethod, SilentMethod } from '../SilentMethod';
import createVirtualResponse from '../virtualTag/createVirtualResponse';
import Null from '../virtualTag/Null';
import Undefined from '../virtualTag/Undefined';
import { vtagKey, vtagValueKey } from './helper';

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

    // 将虚拟标签格式转换回虚拟标签实例
    if (isObject(value) && value?.[vtagKey]) {
      const virtualTagId = value[vtagKey];
      let virtualTagValue = value[vtagValueKey];
      virtualTagValue = createVirtualResponse(
        virtualTagValue === undefinedValue
          ? newInstance(Undefined, virtualTagId)
          : virtualTagValue === nullValue
          ? newInstance(Null, virtualTagId)
          : newInstance(ObjectCls, virtualTagValue),
        virtualTagId
      );

      forEach(objectKeys(value), key => {
        if (!includes([vtagKey, vtagValueKey], key)) {
          virtualTagValue[key] = value[key];
        }
      });
      value = virtualTagValue;
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
    id,
    retryError,
    maxRetryTimes,
    backoff,
    fallbackHandlers,
    resolveHandler,
    rejectHandler,
    methodHandler,
    handlerArgs,
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
