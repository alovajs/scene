export {
  bootSilentFactory,
  onSilentSubmitBoot,
  onSilentSubmitComplete,
  onSilentSubmitError,
  onSilentSubmitSuccess
} from './hooks/silent/silentFactory';
export { silentQueueMap } from './hooks/silent/silentQueue';
export { filterSilentMethods, getSilentMethod } from './hooks/silent/virtualTag/filterSilentMethods';
export { default as updateStateEffect } from './hooks/silent/virtualTag/updateStateEffect';
export { default as vtagDhy } from './hooks/silent/virtualTag/vtagDhy';
export { default as vtagStringify } from './hooks/silent/virtualTag/vtagStringify';
