import { SilentFactoryBootOptions } from '../../../../typings';
import dateSerializer from './date';
import regexpSerializer from './regexp';
import vtag from './vtag';

type SilentMethodSerializerMap = NonNullable<SilentFactoryBootOptions['serializer']>;
export let serializers: SilentMethodSerializerMap = {
	date: dateSerializer,
	regexp: regexpSerializer
};

/**
 * 合并内置序列化器和自定义序列化器
 * @param customSerializers 自定义序列化器
 */
export const mergeSerializer = (customSerializers: SilentMethodSerializerMap = {}) => {
	serializers = {
		...serializers,
		...customSerializers,
		_vtag_: vtag
	};
};
