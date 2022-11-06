import { Alova, FetcherType, invalidateCache, Method, setCacheData, useFetcher, useWatcher } from 'alova';
import { noop } from 'lodash';
import createSyncOnceRunner from '../../../../src/helper/createSyncOnceRunner';
import getUniqueReferenceId from '../../../../src/helper/getUniqueReferenceId';
import { $, compt$, deh$, deh$$, deh_c$, FrameworkComputed, FrameworkState, upd$ } from '../frameworkHooks';

type ArgGetter<R, T> = (data: R) => T | undefined;
interface PaginationConfig<R, T, WS> {
	preloadPreviousPage?: boolean;
	preloadNextPage?: boolean;
	pageCount?: ArgGetter<R, number>;
	total?: ArgGetter<R, number>;
	data?: ArgGetter<R, T>;
	initialData?: any;
	append?: boolean;
	initialPage?: number;
	initialPageSize?: number;
	debounce?: number;
	watchingStates?: WS;
}
interface InsertConfig {
	index?: number;
	onAfter?: () => void;
	onBefore?: () => void;
}

let counter = 0;
export default function usePagination<
	S,
	E,
	R,
	T,
	RC,
	RE,
	RH,
	LD,
	WS extends (FrameworkState<any> | FrameworkComputed<any>)[]
>(
	handler: (page: number, pageSize: number) => Method<S, E, R, T, RC, RE, RH>,
	{
		preloadPreviousPage = true,
		preloadNextPage = true,
		pageCount: pageCountGetter = data => (data as any)['pageCount'],
		total: totalGetter = data => (data as any)['total'],
		data: dataGetter = data => (data as any)['data'],
		initialData,
		append = false,
		initialPage = 1,
		initialPageSize = 10,
		debounce,
		watchingStates = [] as unknown as WS
	}: PaginationConfig<R, LD, WS> = {}
) {
	let isRefresh = false;
	let isReset = false; // 用于控制是否重置
	const page = $(initialPage);
	const pageSize = $(initialPageSize);
	const id = counter++;

	// 构建method name
	const nameHookPrefix = `pagination-hook-${id}`;
	const buildMethodName = (page: number) =>
		`${nameHookPrefix}-${page}-${deh$(pageSize)}-${watchingStates
			.map(state => getUniqueReferenceId(deh$(state)))
			.join('-')}`;

	const states = useWatcher(
		(refreshPage?: number) => {
			const pageVal = refreshPage || deh$(page);
			const pageSizeVal = deh$(pageSize);
			const handlerMethod = handler(pageVal, pageSizeVal);

			// 定义统一的名称，方便管理
			handlerMethod.config.name = buildMethodName(pageVal);
			return handlerMethod;
		},
		[page as E, pageSize as E, ...watchingStates],
		{
			immediate: true,
			initialData,
			debounce,
			force: () => isRefresh
		}
	);

	// 计算data、pageCount、total、isLastPage参数
	const stateData = states.data;
	const data = $([] as IsUnknown<LD, R extends { data: any } ? R['data'] : any, LD>);
	const pageCount = compt$(() => pageCountGetter(deh$$(stateData)) || 0, [stateData]);
	const total = compt$(() => totalGetter(deh$$(stateData)) || 0, [stateData]);
	const lastPage = (page: number) => {
		const pageCountVal = deh_c$(pageCount);
		const dataVal = deh$(data);
		const dataLen = Array.isArray(dataVal) ? dataVal.length : 0;
		return pageCountVal ? page >= pageCountVal : dataLen < deh$(pageSize);
	};
	const canPreload = (preloadPage: number) => preloadPage > 0 && !lastPage(preloadPage);

	// 预加载下一页数据
	const fetchNextPage = () => {
		const nextPage = deh$(page) + 1;
		if (!isRefresh && preloadNextPage && canPreload(nextPage)) {
			fetch(handler(nextPage, deh$(pageSize)));
		}
	};
	// 预加载上一页数据
	const fetchPreviousPage = () => {
		const prevPage = deh$(page) + 1;
		if (!isRefresh && preloadPreviousPage && canPreload(prevPage)) {
			fetch(handler(prevPage, deh$(pageSize)));
		}
	};
	// 如果返回的数据小于pageSize了，则认定为最后一页了
	const isLastPage = compt$(() => lastPage(deh$(page)), [page, pageCount, data, pageSize]);

	const { fetch } = useFetcher<FetcherType<Alova<any, any, any, any, any>>>({ force: false });
	states.onSuccess((rawData, refreshPage?: number) => {
		fetchNextPage();
		fetchPreviousPage();

		const pageSizeVal = deh$(pageSize);
		// 如果追加数据，才更新data
		const listData: any = dataGetter(rawData) || rawData; // 更新data参数
		if (append) {
			// 如果是reset则先清空数据
			if (isReset) {
				upd$(data, [] as any);
			}
			if (refreshPage === undefined) {
				upd$(data as any, [...(deh$(data) as any[]), ...listData]);
			} else if (refreshPage) {
				// 如果是刷新页面，则是替换那一页的数据
				upd$(data, (rawd: any) => {
					rawd.splice((refreshPage - 1) * pageSizeVal, pageSizeVal, ...listData);
					return rawd;
				});
			}
		} else {
			upd$(data, listData);
		}
		isRefresh = false;
		isReset = false;
	});

	/**
	 * 刷新指定页码数据，此函数将忽略缓存强制发送请求
	 * @param refreshPage 刷新的页码
	 */
	const refresh = (refreshPage: number) => {
		isRefresh = true;
		if (append) {
			if (refreshPage > deh$(page)) {
				throw new Error("Refresh page can't greater than page");
			}
			// 更新当前页数据
			states.send(refreshPage);
		} else {
			// 页数相等，则刷新当前页，否则fetch数据
			refreshPage === deh$(page) ? states.send() : fetch(handler(refreshPage, deh$(pageSize)));
		}
	};

	// 临时保存的数据，以便当需要重新加载时用于数据恢复
	let tempData: any;
	// 统计同步移除的数量
	let removedCount = 0;
	const syncRunner = createSyncOnceRunner();
	// 删除此usehook的所有缓存
	const invalidateAllCache = () => invalidateCache(new RegExp('^' + nameHookPrefix));
	/**
	 * 移除一条数据
	 * @param index 移除的索引
	 */
	const remove = (index: number) => {
		// 如果同步移除的数量大于pageSize时，将异步更新本页数据，此时不再进行操作了
		const pageSizeVal = deh$(pageSize);
		const exceedsPagesize = removedCount > pageSizeVal;
		if (exceedsPagesize) {
			return;
		}

		let cachedData: any[] | undefined = undefined;
		const nextPage = deh$(page) + 1;
		setCacheData(buildMethodName(nextPage), (data: any[]) => {
			cachedData = data;
			return false;
		});

		// 如果有下一页数据且同步删除的数量未超过pageSize，则通过缓存数据补位
		if (cachedData) {
			if (!tempData) {
				tempData = [...(deh$(data) as any[])];
			}
			if (index >= 0) {
				upd$(data as any, (rawd: any) => {
					rawd.splice(index, 1);
					return rawd;
				});
				removedCount++;
				// 用下一页的数据补位，从头部开始取
				upd$(data as any, [...(deh$(data) as any[]), cachedData[removedCount - 1]]);
			}
		}

		// 如果没有下一页数据，或同步删除的数量超过了pageSize，则恢复数据并重新加载本页
		// 需异步操作，因为可能超过pageSize后还有remove函数被同步执行
		syncRunner(() => {
			// 让所有缓存失效
			invalidateAllCache();
			if (!cachedData || exceedsPagesize) {
				exceedsPagesize && upd$(data, tempData);
				refresh(nextPage);
			}

			// 重新预加载前后一页的数据
			fetchNextPage();
			fetchPreviousPage();
			tempData = undefined;
			removedCount = 0;
		});
	};

	/**
	 * 插入一条数据
	 * onBefore、插入操作、onAfter三个都需要分别顺序异步执行，因为需要等待视图更新再执行
	 * @param item 插入项
	 * @param config 插入配置
	 */
	const insert = (item: any, { index = -1, onBefore = noop, onAfter = noop }: InsertConfig = {}) => {
		const asyncCall = (fn: Function) =>
			new Promise(resolve => {
				fn();
				setTimeout(resolve);
			});

		asyncCall(onBefore)
			.then(() =>
				asyncCall(() => {
					// 先从末尾去掉一项数据，保证操作页的数量为pageSize
					upd$(data as any, (rawd: any[]) => {
						rawd.pop();
						return rawd;
					});

					// 插入位置为空默认插到最前面
					if (index >= 0) {
						upd$(data as any, (rawd: any[]) => {
							rawd.splice(index, 0, item);
							return rawd;
						});
					} else {
						upd$(data as any, [item, ...(deh$(data) as any[])]);
					}
				})
			)
			.then(onAfter);
	};

	/** @Return */
	return {
		...states,
		page,
		pageSize,

		// 如果需要追加数据，则使用自定义的data状态，否则使用当前的
		data,
		pageCount,
		total,
		isLastPage,

		refresh,
		insert,
		remove
	};
}
