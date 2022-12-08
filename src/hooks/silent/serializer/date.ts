import { DataSerializer } from '../../../../typings';
import { instanceOf } from '../../../helper';
import { undefinedValue } from '../../../helper/variables';

export default {
	forward: data => (instanceOf(data, Date) ? data.getTime() : undefinedValue),
	backward: ts => new Date(ts)
} as DataSerializer;
