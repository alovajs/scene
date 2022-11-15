import { createSyncOnceRunner, getUniqueReferenceId, noop } from '@alova/helper';
import { invalidateCache, setCacheData, useFetcher, useWatcher } from 'alova';

let counter = 0;
export default function (
	handler,
	{
		preloadPreviousPage = true,
		preloadNextPage = true,
		total: totalGetter = data => data['total'],
		data: dataGetter = data => data['data'],
		initialData,
		append = false,
		initialPage = 1,
		initialPageSize = 10,
		debounce,
		watchingStates = [],
		immediate
	},
	$,
	$$,
	upd$,
	_$,
	_exp$,
	_expBatch$,
	watch
) {
	const id = counter++;
	let isRefresh = false;
	let isReset = false; // 用于控制是否重置
	const page = $(initialPage);
	const pageSize = $(initialPageSize);
	const data = $([]);

	// 构建method name
	const nameHookPrefix = `pagination-hook-${id}`;
	const buildMethodName = page =>
		`${nameHookPrefix}-${page}-${_$(pageSize)}-${watchingStates
			.map(state => getUniqueReferenceId(_$(state)))
			.join('-')}`;
	const listDataGetter = rawData => dataGetter(rawData) || rawData;
	const getHandlerMethod = refreshPage => {
		const pageVal = refreshPage || _$(page);
		const pageSizeVal = _$(pageSize);
		const handlerMethod = handler(pageVal, pageSizeVal);

		// 定义统一的名称，方便管理
		handlerMethod.config.name = buildMethodName(pageVal);
		return handlerMethod;
	};

	// 监听状态变化时，重置page为1
	watch(watchingStates, () => {
		upd$(page, 1);
		isReset = true;
	});

	const states = useWatcher(getHandlerMethod, [...watchingStates, page, pageSize], {
		immediate,
		initialData,
		debounce,
		force: () => isRefresh
	});

	const { send } = states;
	// 计算data、total、isLastPage参数
	const totalLocal = $(undefined);
	const total = $$(() => {
		const totalInData = totalGetter(_$(states.data)) || 0;
		const totalLocalVal = _$(totalLocal);
		return totalLocalVal !== undefined ? totalLocalVal : totalInData;
		// return totalLocalVal || totalInData;
	}, _expBatch$(states.data, totalLocal));
	const pageCount = $$(() => Math.ceil(_$(total) / _$(pageSize)), _expBatch$(pageSize, total));
	const canPreload = preloadPage => {
		const pageCountVal = _$(pageCount);
		const exceedPageCount = pageCountVal ? preloadPage > pageCountVal : false;
		return preloadPage > 0 && !exceedPageCount;
	};

	// 预加载下一页数据
	const fetchNextPage = () => {
		const nextPage = _$(page) + 1;
		if (!isRefresh && preloadNextPage && canPreload(nextPage)) {
			fetch(getHandlerMethod(nextPage));
		}
	};
	// 预加载上一页数据
	const fetchPreviousPage = () => {
		const prevPage = _$(page) - 1;
		if (!isRefresh && preloadPreviousPage && canPreload(prevPage)) {
			fetch(getHandlerMethod(prevPage));
		}
	};
	// 如果返回的数据小于pageSize了，则认定为最后一页了
	const isLastPage = $$(() => {
		const pageVal = _$(page);
		const pageCountVal = _$(pageCount);
		const statesDataVal = listDataGetter(_$(states.data));
		const dataLen = Array.isArray(statesDataVal) ? statesDataVal.length : 0;
		return pageCountVal ? pageVal >= pageCountVal : dataLen < _$(pageSize);
	}, _expBatch$(page, pageCount, states.data, pageSize));

	// 更新当前页缓存
	const updateCurrentPageCache = () => {
		setCacheData(buildMethodName(_$(page)), rawData => {
			const cachedListData = listDataGetter(rawData) || [];
			cachedListData.splice(0, cachedListData.length, ..._$(data));
			return rawData;
		});
	};

	let forceFetch = false;
	const fetchStates = useFetcher({
		force: () => isRefresh || forceFetch
	});
	const { fetch, abort: abortFetch } = fetchStates;
	states.onSuccess((rawData, refreshPage) => {
		upd$(totalLocal, undefined); // 重新加载数据后重置为0，让total使用服务端的total参数
		fetchPreviousPage();
		fetchNextPage();

		const pageSizeVal = _$(pageSize);
		// 如果追加数据，才更新data
		const listData = listDataGetter(rawData); // 更新data参数
		if (append) {
			// 如果是reset则先清空数据
			if (isReset) {
				upd$(data, []);
			}
			if (refreshPage === undefined) {
				upd$(data, [..._$(data), ...listData]);
			} else if (refreshPage) {
				// 如果是刷新页面，则是替换那一页的数据
				upd$(data, rawd => {
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
	const refresh = refreshPage => {
		isRefresh = true;
		if (append) {
			if (refreshPage > _$(page)) {
				throw new Error("Refresh page can't greater than page");
			}
			// 更新当前页数据
			send(refreshPage);
		} else {
			// 页数相等，则刷新当前页，否则fetch数据
			refreshPage === _$(page) ? send() : fetch(handler(refreshPage, _$(pageSize)));
		}
	};

	// 临时保存的数据，以便当需要重新加载时用于数据恢复
	let tempData;
	let fillingItem = undefined; // 补位数据项
	const removeSyncRunner = createSyncOnceRunner();
	// 删除除此usehook当前页和下一页的所有相关缓存
	const invalidatePaginationCache = (all = false) => {
		invalidateCache({
			name: new RegExp('^' + nameHookPrefix),
			filter: method => {
				if (all) {
					return all;
				}
				const pageVal = _$(page);
				return ![buildMethodName(pageVal - 1), buildMethodName(pageVal), buildMethodName(pageVal + 1)].includes(
					method.config.name
				);
			}
		});
	};
	/**
	 * 移除一条数据
	 * @param index 移除的索引
	 */
	const remove = index => {
		const pageVal = _$(page);
		const nextPage = pageVal + 1;
		setCacheData(buildMethodName(nextPage), data => {
			const cachedListData = listDataGetter(data);
			// 从下一页列表的头部开始取补位数据
			fillingItem = (cachedListData || []).shift();
			return data;
		});

		const isLastPageVal = _$(isLastPage);
		if (fillingItem || isLastPageVal) {
			// 如果有下一页数据则通过缓存数据补位
			if (!tempData) {
				tempData = [..._$(data)];
			}
			if (index >= 0) {
				upd$(data, rawd => {
					rawd.splice(index, 1);
					// 如果有下一页的补位数据才去补位，因为有可能是最后一页才进入删除的
					fillingItem && rawd.push(fillingItem);
					return rawd;
				});
				upd$(totalLocal, _$(total) - 1);
			}
		} else if (tempData) {
			upd$(data, tempData); // 当移除项数都用完时还原数据，减少不必要的视图渲染
		}
		// 当前页的缓存同步更新
		updateCurrentPageCache();

		// 如果没有下一页数据，或同步删除的数量超过了pageSize，则恢复数据并重新加载本页
		// 需异步操作，因为可能超过pageSize后还有remove函数被同步执行
		removeSyncRunner(() => {
			abortFetch();
			// 缓存失效
			invalidatePaginationCache();
			// 重新预加载前后一页的数据，需要在refresh前执行，因为refresh时isRefresh为true，此时无法fetch数据
			fetchPreviousPage();

			// 强制请求下一页
			forceFetch = true;
			fetchNextPage();
			forceFetch = false;

			// 移除最后一页数据时，就不需要再刷新了
			if (!fillingItem && !isLastPageVal) {
				refresh(pageVal);
			}
			if (!append && isLastPageVal && _$(data).length <= 0) {
				upd$(page, pageVal => pageVal - 1); // 翻页模式下，如果是最后一页且全部项被删除了，则往前翻一页
			}
			tempData = undefined;
			fillingItem = undefined;
		});
	};

	const insertSyncRunner = createSyncOnceRunner(10);
	/**
	 * 插入一条数据
	 * onBefore、插入操作、onAfter三个都需要分别顺序异步执行，因为需要等待视图更新再执行
	 * @param item 插入项
	 * @param config 插入配置
	 */
	const insert = (item, { index = 0, onBefore = noop, onAfter = noop } = {}) => {
		const asyncCall = fn =>
			new Promise(resolve => {
				fn();
				setTimeout(resolve, 10);
			});

		// 插入项后也需要让缓存失效，以免不同条件下缓存未更新
		if (index >= 0) {
			insertSyncRunner(() => {
				abortFetch();
				invalidatePaginationCache();
				fetchPreviousPage();
				fetchNextPage();
			});
		}
		asyncCall(onBefore)
			.then(() =>
				asyncCall(() => {
					const pageVal = _$(page);
					let popItem = undefined;
					upd$(data, rawd => {
						// 先从末尾去掉一项数据，保证操作页的数量为pageSize
						popItem = rawd.pop();
						// 插入位置为空默认插到最前面
						index >= 0 ? rawd.splice(index, 0, item) : rawd.unshift(item);
						return rawd;
					});
					upd$(totalLocal, _$(total) + 1);

					// 当前页的缓存同步更新
					updateCurrentPageCache();

					// 将pop的项放到下一页缓存的头部，与remove的操作保持一致
					// 这样在同步调用insert和remove时表现才一致
					const nextPage = pageVal + 1;
					setCacheData(buildMethodName(nextPage), rawData => {
						const cachedListData = listDataGetter(rawData) || [];
						cachedListData.unshift(popItem);
						return rawData;
					});
				})
			)
			.then(onAfter);
	};

	/**
	 * 从第一页开始重新加载列表，并清空缓存
	 */
	const reload = () => {
		invalidatePaginationCache(true);
		_$(page) === 1 ? send() : upd$(page, 1);
		isReset = true;
	};

	/** @Returns */
	return {
		...states,
		fetching: fetchStates.fetching,
		onFetchSuccess: fetchStates.onSuccess,
		onFetchError: fetchStates.onError,
		onFetchComplete: fetchStates.onComplete,

		page: page,
		pageSize: pageSize,
		data: _exp$(data),
		pageCount: _exp$(pageCount),
		total: _exp$(total),
		isLastPage: _exp$(isLastPage),

		refresh,
		insert,
		remove,
		reload
	};
}
