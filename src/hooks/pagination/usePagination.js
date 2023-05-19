import {
  createAssert,
  createSyncOnceRunner,
  filterItem,
  forEach,
  getLocalCacheConfigParam,
  getTime,
  includes,
  isArray,
  len,
  map,
  objectKeys,
  objectValues,
  pushItem,
  shift,
  splice
} from '@/helper';
import { falseValue, trueValue, undefinedValue } from '@/helper/variables';
import { getMethodKey, invalidateCache, setCache, useFetcher, useWatcher } from 'alova';
import createSnapshotMethodsManager from './createSnapshotMethodsManager';

const paginationAssert = createAssert('usePagination');
const indexAssert = (index, rawData) =>
  paginationAssert(
    typeof index === 'number' && index < len(rawData),
    'index must be a number that less than list length'
  );
export default function (
  handler,
  {
    preloadPreviousPage = trueValue,
    preloadNextPage = trueValue,
    total: totalGetter = res => res.total,
    data: dataGetter = res => res.data,
    initialData,
    append = falseValue,
    initialPage = 1,
    initialPageSize = 10,
    debounce,
    watchingStates = [],
    immediate = trueValue
  },
  $,
  $$,
  upd$,
  _$,
  _exp$,
  _expBatch$,
  watch
) {
  let isReset = falseValue; // 用于控制是否重置
  const page = $(initialPage);
  const pageSize = $(initialPageSize);
  const data = $([]);

  // 保存当前hook所使用到的所有method实例快照
  const {
    snapshots: methodSnapshots,
    get: getSnapshotMethods,
    save: saveSnapshot,
    remove: removeSnapshot
  } = createSnapshotMethodsManager(page => handler(page, _$(pageSize)));

  const listDataGetter = rawData => {
    try {
      paginationAssert(
        rawData && isArray(dataGetter(rawData)),
        'Got wrong array, did you return the correct array of list in `data` function'
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
    return dataGetter(rawData) || rawData;
  };
  const getHandlerMethod = (refreshPage = _$(page)) => {
    const pageSizeVal = _$(pageSize);
    const handlerMethod = handler(refreshPage, pageSizeVal);

    // 定义统一的额外名称，方便管理
    saveSnapshot(handlerMethod);
    return handlerMethod;
  };

  // 监听状态变化时，重置page为1
  watch(watchingStates, () => {
    upd$(page, 1);
    isReset = trueValue;
  });

  const states = useWatcher(getHandlerMethod, [...watchingStates, page, pageSize], {
    immediate,
    initialData,
    debounce,
    force: (_, isRefresh) => isRefresh
  });

  const { send } = states;
  // 计算data、total、isLastPage参数
  const total = $(undefinedValue);
  const pageCount = $$(() => {
    const totalVal = _$(total);
    return totalVal !== undefinedValue ? Math.ceil(totalVal / _$(pageSize)) : undefinedValue;
  }, _expBatch$(pageSize, total));
  const canPreload = (preloadPage, fetchMethod, isNextPage = falseValue) => {
    const { e: expireMilliseconds } = getLocalCacheConfigParam(fetchMethod);
    // 如果缓存时间小于等于当前时间，表示没有设置缓存，此时不再预拉取数据
    if (expireMilliseconds <= getTime()) {
      return;
    }

    const pageCountVal = _$(pageCount);
    const exceedPageCount = pageCountVal
      ? preloadPage > pageCountVal
      : isNextPage // 如果是判断预加载下一页数据且没有pageCount的情况下，通过最后一页数据量是否达到pageSize来判断
      ? len(listDataGetter(_$(states.data))) < _$(pageSize)
      : falseValue;
    return preloadPage > 0 && !exceedPageCount;
  };

  // 预加载下一页数据
  const fetchNextPage = (force = falseValue) => {
    const nextPage = _$(page) + 1;
    const fetchMethod = getHandlerMethod(nextPage);
    if (preloadNextPage && canPreload(nextPage, fetchMethod, trueValue)) {
      fetch(fetchMethod, force);
    }
  };
  // 预加载上一页数据
  const fetchPreviousPage = () => {
    const prevPage = _$(page) - 1;
    const fetchMethod = getHandlerMethod(prevPage);
    if (preloadPreviousPage && canPreload(prevPage, fetchMethod)) {
      fetch(fetchMethod);
    }
  };
  // 如果返回的数据小于pageSize了，则认定为最后一页了
  const isLastPage = $$(() => {
    const dataRaw = _$(states.data);
    if (!dataRaw) {
      return trueValue;
    }
    const statesDataVal = listDataGetter(dataRaw);
    const pageVal = _$(page);
    const pageCountVal = _$(pageCount);
    const dataLen = isArray(statesDataVal) ? len(statesDataVal) : 0;
    return pageCountVal ? pageVal >= pageCountVal : dataLen < _$(pageSize);
  }, _expBatch$(page, pageCount, states.data, pageSize));

  // 更新当前页缓存
  const updateCurrentPageCache = () => {
    const snapShotItem = getSnapshotMethods(_$(page));
    snapShotItem &&
      setCache(snapShotItem.entity, rawData => {
        // 当关闭缓存时，rawData为undefined
        if (rawData) {
          const cachedListData = listDataGetter(rawData) || [];
          splice(cachedListData, 0, len(cachedListData), ..._$(data));
          return rawData;
        }
      });
  };

  // 初始化fetcher
  const fetchStates = useFetcher({
    force: forceFetch => forceFetch
  });
  const { fetch, abort: abortFetch, onSuccess: onFetchSuccess } = fetchStates;
  onFetchSuccess(({ method, data: rawData }) => {
    // 处理当fetch还没响应时就翻页到上或下一页了
    const snapShotItem = getSnapshotMethods(_$(page));
    if (snapShotItem && getMethodKey(snapShotItem.entity) === getMethodKey(method)) {
      // 如果追加数据，才更新data
      const listData = listDataGetter(rawData); // 更新data参数
      if (append) {
        // 下拉加载时需要替换当前页数据
        const dataRaw = _$(data);
        const pageSizeVal = _$(pageSize);

        // 当做移除操作时，替换的数量小于pageSize，此时dataRaw % pageSizeVal会大于0
        // 当新增操作时，替换的数量等于pageSize，此时dataRaw % pageSizeVal会等于0，此时不需要替换
        const replaceNumber = len(dataRaw) % pageSizeVal;
        replaceNumber > 0 &&
          upd$(data, rawd => {
            splice(rawd, (_$(page) - 1) * pageSizeVal, replaceNumber, ...listData);
            return rawd;
          });
      } else {
        upd$(data, listData);
      }
    }
  });
  states.onSuccess(({ data: rawData, sendArgs: [refreshPage, isRefresh], method }) => {
    const { total: cachedTotal } = getSnapshotMethods(method) || {};
    upd$(total, cachedTotal !== undefinedValue ? cachedTotal : totalGetter(rawData));
    if (!isRefresh) {
      fetchPreviousPage();
      fetchNextPage();
    }

    const pageSizeVal = _$(pageSize);
    // 如果追加数据，才更新data
    const listData = listDataGetter(rawData); // 更新data参数
    if (append) {
      // 如果是reset则先清空数据
      if (isReset) {
        upd$(data, []);
      }
      if (refreshPage === undefinedValue) {
        upd$(data, [..._$(data), ...listData]);
      } else if (refreshPage) {
        // 如果是刷新页面，则是替换那一页的数据
        upd$(data, rawd => {
          splice(rawd, (refreshPage - 1) * pageSizeVal, pageSizeVal, ...listData);
          return rawd;
        });
      }
    } else {
      upd$(data, listData);
    }
    isReset = falseValue;
  });

  /**
   * 刷新指定页码数据，此函数将忽略缓存强制发送请求
   * @param refreshPage 刷新的页码
   */
  const refresh = refreshPage => {
    if (append) {
      paginationAssert(refreshPage <= _$(page), "Refresh page can't greater than page");
      // 更新当前页数据
      send(refreshPage, trueValue);
    } else {
      // 页数相等，则刷新当前页，否则fetch数据
      refreshPage === _$(page) ? send(undefinedValue, trueValue) : fetch(handler(refreshPage, _$(pageSize)), trueValue);
    }
  };

  // 临时保存的数据，以便当需要重新加载时用于数据恢复
  let tempData;
  let fillingItem = undefinedValue; // 补位数据项
  const removeSyncRunner = createSyncOnceRunner();
  // 删除除此usehook当前页和下一页的所有相关缓存
  const invalidatePaginationCache = (all = falseValue) => {
    const pageVal = _$(page);
    const snapshotObj = methodSnapshots();
    let snapshots = objectValues(snapshotObj);
    if (all) {
      removeSnapshot();
    } else {
      // 筛选出上一页、当前页、下一页的数据
      const excludeSnapshotKeys = map(
        filterItem(
          [getSnapshotMethods(pageVal - 1), getSnapshotMethods(pageVal), getSnapshotMethods(pageVal + 1)],
          Boolean
        ),
        ({ entity }) => getMethodKey(entity)
      );
      snapshots = map(
        filterItem(objectKeys(snapshotObj), key => !includes(excludeSnapshotKeys, key)),
        key => {
          const item = snapshotObj[key];
          delete snapshotObj[key];
          return item;
        }
      );
    }
    invalidateCache(map(snapshots, ({ entity }) => entity));
  };

  // 单独拿出来的原因是
  // 无论同步调用几次insert、remove，或它们组合调用，reset操作只需要异步执行一次
  const resetSyncRunner = createSyncOnceRunner();
  const resetCache = () => {
    resetSyncRunner(() => {
      abortFetch();
      // 缓存失效
      invalidatePaginationCache();
      // 重新预加载前后一页的数据，需要在refresh被调用前执行，因为refresh时isRefresh为true，此时无法fetch数据
      // fetchPreviousPage();

      // 强制请求下一页
      fetchNextPage(trueValue);
    });
  };

  // 统一更新总条数
  const updateTotal = offset => {
    // 更新当前页
    const totalVal = _$(total);
    if (typeof totalVal === 'number') {
      const offsetedTotal = Math.max(totalVal + offset, 0);
      upd$(total, offsetedTotal);
      const pageVal = _$(page);

      // 更新冗余的total字段
      forEach([getSnapshotMethods(pageVal - 1), getSnapshotMethods(pageVal), getSnapshotMethods(pageVal + 1)], item => {
        item && (item.total = offsetedTotal);
      });
    }
  };

  /**
   * 插入一条数据
   * @param item 插入项
   * @param config 插入配置
   */
  const insert = (item, index = 0) => {
    const pageVal = _$(page);
    let popItem = undefinedValue;
    upd$(data, rawd => {
      // 先从末尾去掉一项数据，保证操作页的数量为pageSize
      popItem = rawd.pop();
      // 插入位置为空默认插到最前面
      splice(rawd, index, 0, item);
      return rawd;
    });
    updateTotal(1);

    // 当前页的缓存同步更新
    updateCurrentPageCache();

    // 将pop的项放到下一页缓存的头部，与remove的操作保持一致
    // 这样在同步调用insert和remove时表现才一致
    const nextPage = pageVal + 1;
    const snapShotItem = getSnapshotMethods(nextPage);
    snapShotItem &&
      setCache(snapShotItem.entity, rawData => {
        if (rawData) {
          const cachedListData = listDataGetter(rawData) || [];
          cachedListData.unshift(popItem);
          cachedListData.pop();
          return rawData;
        }
      });

    // 插入项后也需要让缓存失效，以免不同条件下缓存未更新
    resetCache();
  };

  /**
   * 移除一条数据
   * @param index 移除的索引
   */
  const remove = index => {
    indexAssert(index, _$(data));
    const pageVal = _$(page);
    const nextPage = pageVal + 1;
    const snapShotItem = getSnapshotMethods(nextPage);
    snapShotItem &&
      setCache(snapShotItem.entity, rawData => {
        if (rawData) {
          const cachedListData = listDataGetter(rawData);
          // 从下一页列表的头部开始取补位数据
          fillingItem = shift(cachedListData || []);
          return rawData;
        }
      });

    const isLastPageVal = _$(isLastPage);
    if (fillingItem || isLastPageVal) {
      // 如果有下一页数据则通过缓存数据补位
      if (!tempData) {
        tempData = [..._$(data)];
      }
      if (index >= 0) {
        upd$(data, rawd => {
          splice(rawd, index, 1);
          // 如果有下一页的补位数据才去补位，因为有可能是最后一页才进入删除的
          fillingItem && pushItem(rawd, fillingItem);
          return rawd;
        });
      }
    } else if (tempData) {
      upd$(data, tempData); // 当移除项数都用完时还原数据，减少不必要的视图渲染
    }

    updateTotal(-1);
    // 当前页的缓存同步更新
    updateCurrentPageCache();

    // 如果没有下一页数据，或同步删除的数量超过了pageSize，则恢复数据并重新加载本页
    // 需异步操作，因为可能超过pageSize后还有remove函数被同步执行
    resetCache();
    removeSyncRunner(() => {
      // 移除最后一页数据时，就不需要再刷新了
      if (!fillingItem && !isLastPageVal) {
        refresh(pageVal);
      }
      if (!append && isLastPageVal && len(_$(data)) <= 0) {
        upd$(page, pageVal => pageVal - 1); // 翻页模式下，如果是最后一页且全部项被删除了，则往前翻一页
      }
      tempData = undefinedValue;
      fillingItem = undefinedValue;
    });
  };

  /**
   * 替换列表中的项
   * @param {any} item 替换项
   * @param {number} index 插入位置
   */
  const replace = (item, index) => {
    indexAssert(index, _$(data));
    upd$(data, rawd => {
      splice(rawd, index, 1, item);
      return rawd;
    });
    // 当前页的缓存同步更新
    updateCurrentPageCache();
  };

  /**
   * 从第一页开始重新加载列表，并清空缓存
   */
  const reload = () => {
    invalidatePaginationCache(trueValue);
    _$(page) === 1 ? send() : upd$(page, 1);
    isReset = trueValue;
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
    replace,
    reload
  };
}
