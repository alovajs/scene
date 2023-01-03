import { $, $$, upd$, watch, _$, _exp$, _expBatch$ } from './framework/react';
import usePagination_unified from './hooks/pagination/usePagination_unified';
import { default as useSQRequest_unified } from './hooks/silent/useSQRequest';

export const usePagination = (handler, config = {}) =>
  usePagination_unified(handler, config, $, $$, upd$, _$, _exp$, _expBatch$, watch);

// 已通过 hooks/silent/useSQRequest 导入测试
/* c8 ignore start */
export const useSQRequest = (handler, config = {}) => useSQRequest_unified(handler, config);

export {
  bootSilentFactory,
  onSilentSubmitBoot,
  onSilentSubmitComplete,
  onSilentSubmitError,
  onSilentSubmitSuccess
} from './hooks/silent/silentFactory';
export { silentQueueMap } from './hooks/silent/silentQueue';
export { default as dehydrateVData } from './hooks/silent/virtualResponse/dehydrateVData';
export { filterSilentMethods, getSilentMethod } from './hooks/silent/virtualResponse/filterSilentMethods';
export { default as stringifyVData } from './hooks/silent/virtualResponse/stringifyVData';
export { default as updateStateEffect } from './hooks/silent/virtualResponse/updateStateEffect';

