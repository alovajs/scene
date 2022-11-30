import usePagination_unified from './core/usePagination_unified';
import { $, $$, upd$, watch, _$, _exp$, _expBatch$ } from './framework/react';

export const usePagination = (handler, config = {}) =>
	usePagination_unified(handler, config, $, $$, upd$, _$, _exp$, _expBatch$, watch);
