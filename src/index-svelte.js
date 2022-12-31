import { $, $$, upd$, watch, _$, _exp$, _expBatch$ } from './framework/svelte';
import usePagination_unified from './hooks/pagination/usePagination_unified';
import { default as useSQRequest_unified } from './hooks/silent/useSQRequest';

export const usePagination = (handler, config = {}) =>
  usePagination_unified(handler, config, $, $$, upd$, _$, _exp$, _expBatch$, watch);

// 已通过 hooks/silent/useSQRequest 导入测试
/* c8 ignore start */
export const useSQRequest = (handler, config = {}) => useSQRequest_unified(handler, config);
