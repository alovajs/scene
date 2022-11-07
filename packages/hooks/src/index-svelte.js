import usePagination_unified from './core/usePagination_unified';
import { $, $$, upd$, _$ } from './framework/svelte';

export const usePagination = (handler, config) => usePagination_unified(handler, config, $, $$, upd$, _$);
