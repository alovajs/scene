import { Alova, FetcherType, Method, useFetcher, useWatcher } from 'alova';
import { get } from 'lodash';
import { readonly, Ref, ref } from 'vue';

interface PaginationConfig {
	preloadPreviousPage?: boolean;
	preloadNextPage?: boolean;
	pageCount?: string;
	total?: string;
	data?: string;
	initialData?: any;
	append?: boolean;
	initialPage?: number;
	initialPageSize?: number;
	debounce?: number;
}
export default function usePagination<S extends Ref, E extends Ref, R, T, RC, RE, RH>(
	handler: (page: number, pageSize: number) => Method<S, E, R, T, RC, RE, RH>,
	{
		preloadPreviousPage = true,
		preloadNextPage = true,
		pageCount: pathPageCount = 'pageCount',
		total: pathTotal = 'total',
		data: pathData = 'data',
		initialData,
		append = false,
		initialPage = 1,
		initialPageSize = 10,
		debounce
	}: PaginationConfig
) {
	let isRefresh = false;
	let isReset = false; // 用于控制是否重置
	const page = ref(initialPage);
	const pageSize = ref(initialPageSize);
	const pageCount = ref(undefined as number | undefined);
	const total = ref(undefined as number | undefined);
	const data = ref([] as any[]);
	const isLastPage = ref(false);
	const states = useWatcher(
		(refreshPage?: number) => handler(refreshPage || page.value, pageSize.value),
		[page as E, pageSize as E],
		{
			immediate: true,
			initialData,
			debounce,
			force: () => isRefresh
		}
	);

	const { fetch } = useFetcher<FetcherType<Alova<Ref, Ref, any, any, any>>>({ force: false });
	states.onSuccess((rawData: any, refreshPage?: number) => {
		const pageVal = page.value;
		const pageSizeVal = pageSize.value;
		const pageCountVal = pageCount.value;

		let listData = pathData !== '' ? get(rawData, pathData) : rawData; // 更新data参数
		listData = listData || rawData;

		const lastPage = (page: number) => (pageCountVal ? page >= pageCountVal : rawData.length < pageSizeVal);
		// 如果返回的数据小于pageSize了，则认定为最后一页了
		isLastPage.value = lastPage(pageVal);

		const canPreload = (preloadPage: number) => preloadPage > 0 && !lastPage(preloadPage);
		// 预加载下一页数据
		if (!isRefresh && preloadNextPage && canPreload(pageVal + 1)) {
			fetch(handler(pageVal + 1, pageSizeVal));
		}
		// 预加载上一页数据
		if (!isRefresh && preloadPreviousPage && canPreload(pageVal - 1)) {
			fetch(handler(pageVal - 1, pageSizeVal));
		}

		// 如果追加数据，才更新data
		if (append) {
			// 如果是reset则先清空数据
			if (isReset) {
				data.value = [];
			}
			if (refreshPage === undefined) {
				data.value.push(...listData);
			} else if (refreshPage) {
				// 如果是刷新页面，则是替换那一页的数据
				data.value.splice((refreshPage - 1) * pageSizeVal, pageSizeVal, ...listData);
			}
		}

		// 更新pageCount、total参数
		const pageCountData = get(rawData, pathPageCount); // 获取pageCount参数
		if (pageCountData !== undefined) {
			pageCount.value = pageCountData;
		}
		const totalData = get(rawData, pathTotal); // 获取total参数
		if (totalData !== undefined) {
			total.value = totalData;
		}
		isRefresh = false;
		isReset = false;
	});

	return {
		...states,
		page,
		pageSize,

		// 如果需要追加数据，则使用自定义的data状态，否则使用当前的
		data: append ? data : states.data,
		pageCount,
		total: readonly(total),
		isLastPage: readonly(isLastPage),

		/**
		 * 刷新指定页码数据，此函数将忽略缓存强制发送请求
		 * @param refreshPage 刷新的页码
		 */
		refresh: (refreshPage: number) => {
			isRefresh = true;
			if (append) {
				if (refreshPage > page.value) {
					throw new Error("Refresh page can't greater than page");
				}
				// 更新当前页数据
				states.send(refreshPage);
			} else {
				// 页数相等，则刷新当前页，否则fetch数据
				refreshPage === page.value ? states.send() : fetch(handler(refreshPage, pageSize.value));
			}
		},

		/**
		 * @description 重置翻页，append模式下将重新加载第一页，页码模式下重新加载第一页
		 */
		reset: () => {
			isReset = true;
			if (page.value !== 1) {
				page.value = 1;
			} else {
				states.send();
			}
		}
	};
}
