import { WatcherHookConfig } from 'alova';

/** 判断是否为any */
type IsAny<T, P, N> = 0 extends 1 & T ? P : N;

/** 判断是否为unknown */
type IsUnknown<T, P, N> = 1 extends 1 & T ? P : N;

/** @description usePagination相关 */
type ArgGetter<R, T> = (data: R) => T | undefined;
interface PaginationConfig<R, LD, WS> {
	preloadPreviousPage?: boolean;
	preloadNextPage?: boolean;
	pageCount?: ArgGetter<R, number>;
	total?: ArgGetter<R, number>;
	data?: ArgGetter<R, LD>;
	initialData?: WatcherHookConfig['initialData'];
	append?: boolean;
	initialPage?: number;
	initialPageSize?: number;
	debounce?: WatcherHookConfig['debounce'];
	watchingStates?: WS;
}
interface InsertConfig {
	index?: number;
	onAfter?: () => void;
	onBefore?: () => void;
}
