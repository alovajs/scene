import { DataSerializer } from '../../../../typings';
import { instanceOf, newInstance } from '../../../helper';

export default {
  forward: data => (instanceOf(data, RegExp) ? data.source : undefined),
  backward: source => newInstance(RegExp, source)
} as DataSerializer;
