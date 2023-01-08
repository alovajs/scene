import { $, $$, upd$, watch, _$, _exp$, _expBatch$ } from '../../src/framework/svelte';
import usePagination_unified from '../../src/hooks/pagination/usePagination_unified';
import { default as useSQRequest_unified } from '../../src/hooks/silent/useSQRequest';

export const usePagination = (handler, config = {}) =>
  usePagination_unified(handler, config, $, $$, upd$, _$, _exp$, _expBatch$, watch);

// 已通过 hooks/silent/useSQRequest 导入测试
/* c8 ignore start */
export const useSQRequest = (handler, config = {}) => useSQRequest_unified(handler, config);
export {
  bootSilentFactory,
  onBeforeSilentSubmit,
  onSilentSubmitBoot,
  onSilentSubmitError,
  onSilentSubmitFail,
  onSilentSubmitSuccess
} from '../../src/hooks/silent/silentFactory';
export { silentQueueMap } from '../../src/hooks/silent/silentQueue';
export { default as dehydrateVData } from '../../src/hooks/silent/virtualResponse/dehydrateVData';
export { filterSilentMethods, getSilentMethod } from '../../src/hooks/silent/virtualResponse/filterSilentMethods';
export { default as stringifyVData } from '../../src/hooks/silent/virtualResponse/stringifyVData';
export { default as updateStateEffect } from '../../src/hooks/silent/virtualResponse/updateStateEffect';

