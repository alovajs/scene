import usePagination_unified from './core/usePagination_unified';
import { $, $$, upd$, _$ } from './framework/react';

export const usePagination = (handler, config) => usePagination_unified(handler, config, $, $$, upd$, _$);
