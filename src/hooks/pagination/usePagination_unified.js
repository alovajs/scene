import { invalidateCache, setCacheData, useFetcher, useWatcher } from 'alova';
import {
  createAssert,
  createSyncOnceRunner,
  getUniqueReferenceId,
  isArray,
  map,
  newInstance,
  shift,
  splice
} from '../../helper';
import { falseValue, trueValue, undefinedValue } from '../../helper/variables';

const paginationAssert = createAssert('usePagination');
let counter = 0;
export default function (
  handler,
  {
    preloadPreviousPage = trueValue,
    preloadNextPage = trueValue,
    total: totalGetter = data => data['total'],
    data: dataGetter = data => data['data'],
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
  const id = counter++;
  let isRefresh = falseValue;
  let isReset = falseValue; // 用于控制是否重置
  const page = $(initialPage);
  const pageSize = $(initialPageSize);
  const data = $([]);

  // 构建method name
  const nameHookPrefix = `pagination-hook-${id}`;
  const buildMethodName = page =>
    `${nameHookPrefix}-${page}-${_$(pageSize)}-${map(watchingStates, state => getUniqueReferenceId(_$(state))).join(
      '-'
    )}`;
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
    isReset = trueValue;
  });

  const states = useWatcher(getHandlerMethod, [...watchingStates, page, pageSize], {
    immediate,
    initialData,
    debounce,
    force: () => isRefresh
  });

  const { send } = states;
  // 计算data、total、isLastPage参数
  const totalLocal = $(undefinedValue);
  const total = $$(() => {
    const totalInData = totalGetter(_$(states.data));
    const totalLocalVal = _$(totalLocal);
    return totalLocalVal !== undefinedValue ? totalLocalVal : totalInData;
  }, _expBatch$(states.data, totalLocal));
  const pageCount = $$(() => {
    const totalVal = _$(total);
    return totalVal !== undefinedValue ? Math.ceil(totalVal / _$(pageSize)) : undefinedValue;
  }, _expBatch$(pageSize, total));
  const canPreload = (preloadPage, isNextPage = falseValue) => {
    const pageCountVal = _$(pageCount);
    const exceedPageCount = pageCountVal
      ? preloadPage > pageCountVal
      : isNextPage // 如果是判断预加载下一页数据且没有pageCount的情况下，通过最后一页数据量是否达到pageSize来判断
      ? listDataGetter(_$(states.data)).length < _$(pageSize)
      : falseValue;
    return preloadPage > 0 && !exceedPageCount;
  };

  // 预加载下一页数据
  const fetchNextPage = () => {
    const nextPage = _$(page) + 1;
    if (!isRefresh && preloadNextPage && canPreload(nextPage, trueValue)) {
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
    const dataLen = isArray(statesDataVal) ? statesDataVal.length : 0;
    return pageCountVal ? pageVal >= pageCountVal : dataLen < _$(pageSize);
  }, _expBatch$(page, pageCount, states.data, pageSize));

  // 更新当前页缓存
  const updateCurrentPageCache = () => {
    setCacheData(buildMethodName(_$(page)), rawData => {
      const cachedListData = listDataGetter(rawData) || [];
      splice(cachedListData, 0, cachedListData.length, ..._$(data));
      return rawData;
    });
  };

  let forceFetch = falseValue;
  const fetchStates = useFetcher({
    force: () => isRefresh || forceFetch
  });
  const { fetch, abort: abortFetch } = fetchStates;
  states.onSuccess(event => {
    const {
      data: rawData,
      sendArgs: [refreshPage]
    } = event;
    upd$(totalLocal, undefinedValue); // 重新加载数据后重置为0，让total使用服务端的total参数
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
    isRefresh = falseValue;
    isReset = falseValue;
  });

  /**
   * 刷新指定页码数据，此函数将忽略缓存强制发送请求
   * @param refreshPage 刷新的页码
   */
  const refresh = refreshPage => {
    isRefresh = trueValue;
    if (append) {
      paginationAssert(refreshPage <= _$(page), "Refresh page can't greater than page");
      // 更新当前页数据
      send(refreshPage);
    } else {
      // 页数相等，则刷新当前页，否则fetch数据
      refreshPage === _$(page) ? send() : fetch(handler(refreshPage, _$(pageSize)));
    }
  };

  // 临时保存的数据，以便当需要重新加载时用于数据恢复
  let tempData;
  let fillingItem = undefinedValue; // 补位数据项
  const removeSyncRunner = createSyncOnceRunner();
  // 删除除此usehook当前页和下一页的所有相关缓存
  const invalidatePaginationCache = (all = falseValue) => {
    invalidateCache({
      name: newInstance(RegExp, '^' + nameHookPrefix),
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
      forceFetch = trueValue;
      fetchNextPage();
      forceFetch = falseValue;
    });
  };

  /**
   * 插入一条数据
   * onBefore、插入操作、onAfter三个都需要分别顺序异步执行，因为需要等待视图更新再执行
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
      index >= 0 ? splice(rawd, index, 0, item) : rawd.unshift(item);
      return rawd;
    });
    const totalVal = _$(total);
    typeof totalVal === 'number' && upd$(totalLocal, totalVal + 1);

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

    // 插入项后也需要让缓存失效，以免不同条件下缓存未更新
    resetCache();
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
      fillingItem = shift(cachedListData || []);
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
          splice(rawd, index, 1);
          // 如果有下一页的补位数据才去补位，因为有可能是最后一页才进入删除的
          fillingItem && rawd.push(fillingItem);
          return rawd;
        });
        const totalVal = _$(total);
        totalVal && upd$(totalLocal, Math.max(totalVal - 1, 0)); // 不能小于0
      }
    } else if (tempData) {
      upd$(data, tempData); // 当移除项数都用完时还原数据，减少不必要的视图渲染
    }
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
      if (!append && isLastPageVal && _$(data).length <= 0) {
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
    paginationAssert(
      typeof index === 'number' && index < _$(data).length,
      'index must be a number that less than list length'
    );
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
