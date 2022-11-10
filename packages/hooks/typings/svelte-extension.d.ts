import { CompleteHandler, ErrorHandler, Method, Progress, SuccessHandler } from 'alova';
import { Readable, Writable } from 'svelte/store';

interface UsePaginationReturnType<LD extends any[], R> {
	loading: Writable<boolean>;
	error: Writable<Error | undefined>;
	downloading: Writable<Progress>;
	uploading: Writable<Progress>;
	page: Writable<number>;
	pageSize: Writable<number>;
	data: Writable<LD>;
	pageCount: Readable<number | undefined>;
	total: Readable<number | undefined>;
	isLastPage: Readonly<Readable<boolean>>;

	abort: () => void;
	send: (...args: any[]) => Promise<R>;
	onSuccess: (handler: SuccessHandler<R>) => void;
	onError: (handler: ErrorHandler) => void;
	onComplete: (handler: CompleteHandler) => void;

	fetching: Writable<boolean>;
	onFetchSuccess: (handler: SuccessHandler<R>) => void;
	onFetchError: (handler: ErrorHandler) => void;
	onFetchComplete: (handler: CompleteHandler) => void;

	/**
	 * 刷新指定页码数据，此函数将忽略缓存强制发送请求
	 * @param refreshPage 刷新的页码
	 */
	refresh: (refreshPage: number) => void;

	/**
	 * 插入一条数据
	 * onBefore、插入操作、onAfter三个都需要分别顺序异步执行，因为需要等待视图更新再执行
	 * @param item 插入项
	 * @param config 插入配置
	 */
	insert: (item: LD[number], config?: InsertConfig) => void;

	/**
	 * 移除一条数据
	 * @param index 移除的索引
	 */
	remove: (index: any) => void;

	/**
	 * 从第一页开始重新加载列表，并清空缓存
	 */
	reload: () => void;
}

/**
 * 基于alova.js的svelte分页hook
 * 分页相关状态自动管理、前后一页预加载、自动维护数据的新增/编辑/移除
 *
 * @param handler method创建函数
 * @param config pagination hook配置
 * @returns {UsePaginationReturnType}
 */
export declare function usePagination<
	S extends Writable<any>,
	E extends Writable<any>,
	R,
	T,
	RC,
	RE,
	RH,
	LD extends any[],
	WS extends Readable<any>[]
>(
	handler: (page: number, pageSize: number) => Method<S, E, R, T, RC, RE, RH>,
	config: PaginationConfig<R, LD, WS>
): UsePaginationReturnType<LD, R>;
