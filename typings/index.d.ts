import { WatcherHookConfig } from 'alova';

/** 判断是否为any */
type IsAny<T, P, N> = 0 extends 1 & T ? P : N;

/** 判断是否为unknown */
type IsUnknown<T, P, N> = 1 extends 1 & T ? P : N;

/** @description usePagination相关 */
type ArgGetter<R, LD> = (data: R) => LD | undefined;
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

/** 静默方法实例匹配器 */
type SilentMethodFilter =
	| string
	| RegExp
	| {
			name: string | RegExp;
			filter: (method: SilentMethod, index: number, methods: SilentMethod[]) => boolean;
	  };

type SilentSubmitBootHandler = () => void;
type SilentSubmitSuccessHandler = (data: any) => void;
type SilentSubmitErrorHandler = (error: any) => void;
type SilentSubmitCompleteHandler = () => void;
declare function onSilentSubmitBoot(handler: SilentSubmitBootHandler): void;
declare function onSilentSubmitSuccess(handler: SilentSubmitSuccessHandler<R>): void;
declare function onSilentSubmitError(handler: SilentSubmitErrorHandler): void;
declare function onSilentSubmitComplete(handler: SilentSubmitCompleteHandler): void;
