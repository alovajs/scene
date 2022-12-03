import { DataSerializer } from '../../../../typings';
import { instanceOf } from '../../../helper';

export default {
	forward: data => (instanceOf(data, Date) ? data.getTime() : undefined),
	backward: ts => new Date(ts)
} as DataSerializer;
