import { createSyncOnceRunner, getUniqueReferenceId, noop } from '@alova/helper';
import { invalidateCache, setCacheData, useFetcher, useWatcher } from 'alova';

let counter = 0;
export default function (
	handler,
	{
		preloadPreviousPage = true,
		preloadNextPage = true,
		pageCount: pageCountGetter = data => data['pageCount'],
		total: totalGetter = data => data['total'],
		data: dataGetter = data => data['data'],
		initialData,
		append = false,
		initialPage = 1,
		initialPageSize = 10,
		debounce,
		watchingStates = []
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

	const states = useWatcher(getHandlerMethod, [page, pageSize, ...watchingStates], {
		immediate: true,
		initialData,
		debounce,
		force: () => isRefresh
	});

	// 计算data、pageCount、total、isLastPage参数
	const stateData = states.data;
	const pageCount = $$(() => pageCountGetter(_$(stateData)) || 0, [stateData]);
	const total = $$(() => totalGetter(_$(stateData)) || 0, [stateData]);
	const lastPage = page => {
		const pageCountVal = _$(pageCount);
		const statesDataVal = listDataGetter(_$(states.data));
		const dataLen = Array.isArray(statesDataVal) ? statesDataVal.length : 0;
		return pageCountVal ? page >= pageCountVal : dataLen < _$(pageSize);
	};
	const canPreload = preloadPage => preloadPage > 0 && !lastPage(preloadPage);

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
	const isLastPage = $$(() => lastPage(_$(page)), _expBatch$(page, pageCount, data, pageSize));

	const fetchStates = useFetcher({
		force: () => isRefresh
	});
	const { fetch } = fetchStates;
	states.onSuccess((rawData, refreshPage) => {
		fetchNextPage();
		fetchPreviousPage();

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
			states.send(refreshPage);
		} else {
			// 页数相等，则刷新当前页，否则fetch数据
			refreshPage === _$(page) ? states.send() : fetch(handler(refreshPage, _$(pageSize)));
		}
	};

	// 临时保存的数据，以便当需要重新加载时用于数据恢复
	let tempData;
	// 统计同步移除的数量
	let removedCount = 0;
	const removeSyncRunner = createSyncOnceRunner();
	// 删除所有缓存，如果exceptCurrent = true，则删除除此usehook当前页的所有相关缓存
	const invalidatePaginationCache = (exceptCurrent = true) =>
		invalidateCache({
			name: new RegExp('^' + nameHookPrefix),
			filter: method => (exceptCurrent ? method.config.name !== buildMethodName(_$(page)) : true)
		});
	/**
	 * 移除一条数据
	 * @param index 移除的索引
	 */
	const remove = index => {
		// 如果同步移除的数量大于pageSize时，将异步更新本页数据，此时不再进行操作了
		// 因为此块代码在函数头部，因此当pageSize + 1次进入函数时，其removedCount是刚好等于pageSize的
		const pageSizeVal = _$(pageSize);
		const exceedsPagesize = () => removedCount >= pageSizeVal;
		if (exceedsPagesize()) {
			upd$(data, tempData); // 当移除项数大于pageSize时同步还原数据，减少不必要的视图渲染
			return;
		}

		let cachedListData = undefined;
		const pageVal = _$(page);
		const nextPage = pageVal + 1;
		setCacheData(buildMethodName(nextPage), data => {
			cachedListData = listDataGetter(data);
			return false;
		});

		// 如果有下一页数据且同步删除的数量未超过pageSize，则通过缓存数据补位
		if (cachedListData) {
			if (!tempData) {
				tempData = [..._$(data)];
			}
			if (index >= 0) {
				upd$(data, rawd => {
					rawd.splice(index, 1);
					return rawd;
				});
				removedCount++;
				// 用下一页的数据补位，从头部开始取
				upd$(data, [..._$(data), cachedListData[removedCount - 1]]);
			}
		}

		// 如果没有下一页数据，或同步删除的数量超过了pageSize，则恢复数据并重新加载本页
		// 需异步操作，因为可能超过pageSize后还有remove函数被同步执行
		removeSyncRunner(() => {
			// 让所有缓存失效
			invalidatePaginationCache();
			// 重新预加载前后一页的数据，需要在refresh前执行，因为refresh时isRefresh为true，此时无法fetch数据
			fetchNextPage();
			fetchPreviousPage();

			// 因为有作用域限制，因此exceedsPagesize需要以函数形式实现
			if (!cachedListData || exceedsPagesize()) {
				refresh(pageVal);
			}
			tempData = undefined;
			removedCount = 0;
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
				setTimeout(resolve);
			});

		// 插入项后也需要让缓存失效，以免不同条件下缓存未更新
		if (index >= 0) {
			insertSyncRunner(() => {
				invalidatePaginationCache();
				fetchNextPage();
				fetchPreviousPage();
			});
		}
		asyncCall(onBefore)
			.then(() =>
				asyncCall(() => {
					// 先从末尾去掉一项数据，保证操作页的数量为pageSize
					upd$(data, rawd => {
						rawd.pop();
						return rawd;
					});

					// 插入位置为空默认插到最前面
					if (index >= 0) {
						upd$(data, rawd => {
							rawd.splice(index, 0, item);
							return rawd;
						});
					} else {
						upd$(data, [item, ..._$(data)]);
					}
				})
			)
			.then(onAfter);
	};

	/**
	 * 从第一页开始重新加载列表，并清空缓存
	 */
	const reload = () => {
		invalidatePaginationCache();
		upd$(page, 1);
		isReset = true;
	};

	/** @Returns */
	return {
		...states,
		fetching: fetchStates.fetching,
		onFetchSuccess: fetchStates.onSuccess,
		onFetchError: fetchStates.onError,
		onFetchComplete: fetchStates.onComplete,

		page: _exp$(page),
		pageSize: _exp$(pageSize),
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
