import { DataSerializer } from '../../../../typings/general';
import { instanceOf, newInstance } from '../../../helper';
import { RegExpCls } from '../../../helper/variables';

export default {
  forward: data => (instanceOf(data, RegExpCls) ? data.source : undefined),
  backward: source => newInstance(RegExpCls, source)
} as DataSerializer;
