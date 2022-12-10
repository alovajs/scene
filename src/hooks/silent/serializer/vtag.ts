import { DataSerializer } from '../../../../typings';
import { instanceOf } from '../../../helper';
import { nullValue, ObjectCls, trueValue, undefinedValue } from '../../../helper/variables';
import { createNullWrapper, Null } from '../virtualTag/Null';
import stringifyVtag from '../virtualTag/stringifyVtag';
import { createUndefinedWrapper, Undefined } from '../virtualTag/Undefined';

const undefinedFlag = '__$$undef__';
export default {
	forward: data => {
		const virtualTagId = stringifyVtag(data);

		// 如果是undefined或null的包装类，则需要自行指定标识值
		return virtualTagId
			? [virtualTagId, instanceOf(data, Undefined) ? undefinedFlag : instanceOf(data, Null) ? null : data]
			: undefinedValue;
	},
	backward: ([virtualTagId, raw]) =>
		raw === undefinedFlag
			? createUndefinedWrapper({ v: trueValue }, virtualTagId)
			: raw === nullValue
			? createNullWrapper({ v: trueValue }, virtualTagId)
			: new ObjectCls(raw)
} as DataSerializer;
