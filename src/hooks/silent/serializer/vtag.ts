import { DataSerializer } from '../../../../typings';
import { instanceOf, newInstance } from '../../../helper';
import { nullValue, ObjectCls, undefinedValue } from '../../../helper/variables';
import createVirtualResponse from '../virtualTag/createVirtualResponse';
import Null from '../virtualTag/Null';
import Undefined from '../virtualTag/Undefined';
import { symbolVirtualTag } from '../virtualTag/variables';

const undefinedFlag = '__$$undef__';
export default {
	forward: data => {
		const virtualTagId = data?.[symbolVirtualTag];

		// 如果是undefined或null的包装类，则需要自行指定标识值
		return virtualTagId
			? [virtualTagId, instanceOf(data, Undefined) ? undefinedFlag : instanceOf(data, Null) ? null : data]
			: undefinedValue;
	},
	backward: ([virtualTagId, raw]) =>
		createVirtualResponse(
			raw === undefinedFlag
				? newInstance(Undefined, virtualTagId)
				: raw === nullValue
				? newInstance(Null, virtualTagId)
				: newInstance(ObjectCls, raw)
		)
} as DataSerializer;
