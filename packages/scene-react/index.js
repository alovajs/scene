import { $, $$, _$, _exp$, _expBatch$, upd$, watch } from '@/framework/react';
import usePagination_unified from '@/hooks/pagination/usePagination_unified';
import { default as useSQRequest_unified } from '@/hooks/silent/useSQRequest';
import { default as useCaptcha_unified } from '@/hooks/useCaptcha';

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
} from '@/hooks/silent/silentFactory';
export { silentQueueMap } from '@/hooks/silent/silentQueue';
export { default as dehydrateVData } from '@/hooks/silent/virtualResponse/dehydrateVData';
export { default as equals } from '@/hooks/silent/virtualResponse/equals';
export { filterSilentMethods, getSilentMethod } from '@/hooks/silent/virtualResponse/filterSilentMethods';
export { default as isVData } from '@/hooks/silent/virtualResponse/isVData';
export { default as stringifyVData } from '@/hooks/silent/virtualResponse/stringifyVData';
export { default as updateStateEffect } from '@/hooks/silent/virtualResponse/updateStateEffect';

// 导出useCaptcha
export const useCaptcha = (handler, config = {}) =>
  useCaptcha_unified(handler, config, $, upd$, _$, _exp$);