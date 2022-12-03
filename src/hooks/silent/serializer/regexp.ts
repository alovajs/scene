import { DataSerializer } from '../../../../typings';
import { instanceOf } from '../../../helper';

export default {
	forward: data => (instanceOf(data, RegExp) ? data.source : undefined),
	backward: source => new RegExp(source)
} as DataSerializer;
