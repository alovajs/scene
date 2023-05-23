import { forEach, includes, instanceOf, isArray, isObject, len, objectKeys, walkObject } from '@/helper';
import { falseValue, ObjectCls, StringCls, trueValue, undefinedValue } from '@/helper/variables';
import { AlovaGlobalStorage } from 'alova';
import { serializers } from '../serializer';
import createVirtualResponse from '../virtualResponse/createVirtualResponse';
import { dehydrateVDataUnified } from '../virtualResponse/dehydrateVData';
import { symbolVDataId } from '../virtualResponse/variables';
import { vDataKey, vDataValueKey } from './helper';

/**
 * 装饰存储适配器，让它具有序列化和反序列化vData和自定义序列化器的能力
 * @param storageAdapter 存储适配器
 */
export default (storageAdapter: AlovaGlobalStorage) => {
  const { set: originalSetter, get: originalGetter } = storageAdapter;

  /**
   * 将set函数修饰为，存储前将带vData和序列化器支持的类型数据转换为纯对象
   */
  storageAdapter.set = (key, response) => {
    if (isObject(response)) {
      response = walkObject(isArray(response) ? [...response] : { ...response }, (value, key, parent) => {
        if (key === vDataValueKey && parent[vDataKey]) {
          return value;
        }

        // 如果序列化的是silentMethod实例，则过滤掉alova实例
        if (key === 'context' && value?.constructor?.name === 'Alova') {
          return undefinedValue;
        }
        const vDataId = value?.[symbolVDataId];
        let primitiveValue = dehydrateVDataUnified(value, falseValue);
        let finallyApplySerializer = undefinedValue as string | undefined;
        // 找到匹配的序列化器并进行值的序列化，未找到则返回原值
        primitiveValue = objectKeys(serializers).reduce((currentValue, serializerName) => {
          if (!finallyApplySerializer) {
            const serializedValue = serializers[serializerName].forward(currentValue);
            if (serializedValue !== undefinedValue) {
              finallyApplySerializer = serializerName;
              currentValue = serializedValue;
            }
          }
          return currentValue;
        }, primitiveValue);

        // 需要用原始值判断，否则像new Number(1)等包装类也会是[object Object]
        const toStringTag = ObjectCls.prototype.toString.call(primitiveValue);
        let isExpanded = trueValue;
        if (toStringTag === '[object Object]') {
          value = { ...value };
          primitiveValue = {};
        } else if (isArray(value)) {
          value = [...value];
          primitiveValue = [];
        } else {
          isExpanded = falseValue;
        }

        if (vDataId) {
          const valueWithVData = {
            [vDataKey]: vDataId,

            // 对于对象和数组来说，它内部的属性会全部通过`...value`放到外部，因此内部的不需要再进行遍历转换了
            // 因此将数组或对象置空，这样既避免了重复转换，又避免了污染原对象
            [vDataValueKey]:
              finallyApplySerializer !== undefinedValue ? [finallyApplySerializer, primitiveValue] : primitiveValue,
            ...value
          };
          // 如果是String类型，将会有像数组一样的如0、1、2为下标，值为字符的项，需将他们过滤掉
          if (instanceOf(value, StringCls)) {
            for (let i = 0; i < len(value as string); i++) {
              delete valueWithVData?.[i];
            }
          }
          // 如果转换成了虚拟数据，则将转换值赋给它内部，并在下面逻辑中统一由value处理
          value = valueWithVData;
        } else if (!isExpanded) {
          value = finallyApplySerializer !== undefinedValue ? [finallyApplySerializer, primitiveValue] : primitiveValue;
        }
        return value;
      });
    }
    originalSetter(key, response);
  };

  /**
   * 将get函数修饰为，为取出的数据转换为带vData和序列化器类型的数据
   */
  storageAdapter.get = key => {
    const storagedResponse = originalGetter(key);
    return isObject(storagedResponse)
      ? walkObject(
          storagedResponse,
          (value: any) => {
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
          },
          falseValue
        )
      : storagedResponse;
  };
};
