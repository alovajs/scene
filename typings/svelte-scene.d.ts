import { CompleteHandler, ErrorHandler, Method, Progress, SuccessHandler } from 'alova';
import { Readable, Writable } from 'svelte/store';
import { IsUnknown, PaginationConfig } from '.';

interface UsePaginationReturnType<LD, R> {
	loading: Writable<boolean>;
	error: Writable<Error | undefined>;
	downloading: Writable<Progress>;
	uploading: Writable<Progress>;
	page: Writable<number>;
	pageSize: Writable<number>;
	data: Writable<
		IsUnknown<
			LD,
			R extends {
				data: any;
			}
				? R['data']
				: R,
			LD
		>
	>;
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
	 * 插入一条数据，未传入index时默认插入到最前面
	 * @param item 插入项
	 * @param index 插入位置（索引）
	 */
	insert: (item: LD extends any[] ? LD[number] : any, index?: number) => void;

	/**
	 * 移除一条数据
	 * @param index 移除的索引
	 */
	remove: (index: number) => void;

	/**
	 * 替换一条数据
	 * @param item 替换项
	 * @param index 替换位置（索引）
	 */
	replace: (item: LD extends any[] ? LD[number] : any, index: number) => void;

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
	LD,
	WS extends Readable<any>[]
>(
	handler: (page: number, pageSize: number) => Method<S, E, R, T, RC, RE, RH>,
	config?: PaginationConfig<R, LD, WS>
): UsePaginationReturnType<LD, R>;
