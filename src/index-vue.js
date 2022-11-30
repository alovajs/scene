import { $, $$, upd$, watch, _$, _exp$, _expBatch$ } from './framework/vue';
import usePagination_unified from './pagination/usePagination_unified';

export const usePagination = (handler, config = {}) =>
	usePagination_unified(handler, config, $, $$, upd$, _$, _exp$, _expBatch$, watch);
