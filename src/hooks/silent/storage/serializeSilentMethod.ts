import { SilentMethod } from '../../../../typings/general';
import { instanceOf, isArray, JSONStringify, len, objectKeys, walkObject } from '../../../helper';
import { falseValue, ObjectCls, StringCls, trueValue, undefinedValue } from '../../../helper/variables';
import { serializers } from '../serializer';
import { dehydrateVDataUnified } from '../virtualResponse/dehydrateVData';
import { symbolVDataId } from '../virtualResponse/variables';
import { vDataKey, vDataValueKey } from './helper';

/**
 * 序列化静默方法实例
 * 如果序列化值有被转换，它将记录转换的序列化器名字供反序列化时使用
 * @param silentMethodInstance 请求方法实例
 * @returns 请求方法的序列化实例
 */
export default <S, E, R, T, RC, RE, RH>(silentMethodInstance: SilentMethod<S, E, R, T, RC, RE, RH>) => {
  // 序列化时需要解锁，否则将访问不到虚拟响应数据内的虚拟数据id
  const transformedData = walkObject({ ...silentMethodInstance }, (value, key, parent) => {
    if (key === vDataValueKey && parent[vDataKey]) {
      return value;
    }

    // 不需要序列化alova实例
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
  const serializedString = JSONStringify(transformedData);
  return serializedString;
};
