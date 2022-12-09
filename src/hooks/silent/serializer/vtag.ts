import { DataSerializer } from '../../../../typings';
import { instanceOf } from '../../../helper';
import { nullValue, ObjectCls, undefinedValue } from '../../../helper/variables';
import { createNullWrapper, createUndefinedWrapper } from '../virtualTag/createVirtualTag';
import { stringVirtualTag } from '../virtualTag/helper';
import Null from '../virtualTag/Null';
import Undefined from '../virtualTag/Undefined';

const undefinedFlag = '__$$undef__';
export default {
	forward: data => {
		const virtualTagId = stringVirtualTag(data);

		// 如果是undefined或null的包装类，则需要自行指定标识值
		return virtualTagId
			? [virtualTagId, instanceOf(data, Undefined) ? undefinedFlag : instanceOf(data, Null) ? null : data]
			: undefinedValue;
	},
	backward: ([virtualTagId, raw]) =>
		raw === undefinedFlag
			? createUndefinedWrapper(virtualTagId)
			: raw === nullValue
			? createNullWrapper(virtualTagId)
			: new ObjectCls(raw)
} as DataSerializer;
