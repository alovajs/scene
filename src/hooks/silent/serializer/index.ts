import { DataSerializer } from '../../../../typings';
import dateSerializer from './date';
import regexpSerializer from './regexp';

export let serializers = {} as Record<string | number, DataSerializer>;
/**
 * 合并内置序列化器和自定义序列化器
 * @param customSerializers 自定义序列化器
 */
export const mergeSerializer = (customSerializers: typeof serializers = {}) => {
  serializers = {
    date: dateSerializer,
    regexp: regexpSerializer,
    ...customSerializers
  };
};
