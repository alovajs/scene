import { $, $$, upd$, watch, _$, _exp$, _expBatch$ } from './framework/react';
import usePagination_unified from './hooks/pagination/usePagination_unified';
import { default as useSQRequest_unified } from './hooks/silent/useSQRequest';

export const usePagination = (handler, config = {}) =>
	usePagination_unified(handler, config, $, $$, upd$, _$, _exp$, _expBatch$, watch);


export const useSQRequest = (handler, config = {}) => useSQRequest_unified(handler, config);
