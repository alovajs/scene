export {
	bootSilentFactory,
	onSilentSubmitBoot,
	onSilentSubmitComplete,
	onSilentSubmitError,
	onSilentSubmitSuccess
} from './hooks/silent/silentFactory';
export { silentQueueMap } from './hooks/silent/silentQueue';
export { filterSilentMethods, getSilentMethod } from './hooks/silent/virtualTag/filterSilentMethods';
export { default as stringifyVtag } from './hooks/silent/virtualTag/stringifyVtag';
export { default as updateStateEffect } from './hooks/silent/virtualTag/updateStateEffect';
export { default as valueOf } from './hooks/silent/virtualTag/valueOf';
