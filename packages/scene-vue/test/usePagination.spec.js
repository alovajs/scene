import { createAlova, setCacheData } from 'alova';
import VueHook from 'alova/vue';
import { ref } from 'vue';
import {
  mockRequestAdapter,
  setMockListData,
  setMockListWithSearchData,
  setMockShortListData
} from '../../../test/mockData';
import { untilCbCalled } from '../../../test/utils';
import { usePagination } from '../index';

// 防止Vue warn打印
const warn = console.warn;
console.warn = (...args) => {
  args = args.filter(a => !/vue warn/i.test(a));
  if (args.length > 0) {
    warn.apply(console, args);
  }
};

// reset data
beforeEach(() => setMockListData());
beforeEach(() => setMockListWithSearchData());
beforeEach(() => setMockShortListData());
const createMockAlova = () =>
  createAlova({
    baseURL: 'http://localhost:8080',
    statesHook: VueHook,
    requestAdapter: mockRequestAdapter
  });
describe('vue usePagination', () => {
  // 分页相关测试
  test('load paginated data and change page/pageSize', async () => {
    const alovaInst = createMockAlova();
    const getter = (page, pageSize) =>
      alovaInst.Get('/list', {
        params: {
          page,
          pageSize
        }
      });

    const { data, pageCount, total, page, pageSize, isLastPage, onSuccess } = usePagination(getter, {
      total: res => res.total,
      data: res => res.list
    });

    await untilCbCalled(onSuccess);
    expect(page.value).toBe(1);
    expect(pageSize.value).toBe(10);
    expect(data.value.length).toBe(pageSize.value);
    expect(data.value[0]).toBe(0);
    expect(total.value).toBe(300);
    expect(pageCount.value).toBe(Math.ceil(total.value / pageSize.value));
    expect(isLastPage.value).toBeFalsy();

    // 检查预加载缓存
    await untilCbCalled(setTimeout, 100);
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      expect(cache.list).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
      return false;
    });
    setCacheData(getter(page.value - 1, pageSize.value), cache => {
      expect(cache).toBeUndefined();
      return false;
    });

    page.value++;
    await untilCbCalled(onSuccess);
    expect(page.value).toBe(2);
    expect(pageSize.value).toBe(10);
    expect(data.value.length).toBe(pageSize.value);
    expect(data.value[0]).toBe(10);
    expect(total.value).toBe(300);
    expect(pageCount.value).toBe(Math.ceil(total.value / pageSize.value));
    expect(isLastPage.value).toBeFalsy();

    pageSize.value = 20;
    await untilCbCalled(onSuccess);
    expect(page.value).toBe(2);
    expect(pageSize.value).toBe(20);
    expect(data.value.length).toBe(pageSize.value);
    expect(data.value[0]).toBe(20);
    expect(total.value).toBe(300);
    expect(pageCount.value).toBe(Math.ceil(total.value / pageSize.value));
    expect(isLastPage.value).toBeFalsy();

    // 检查预加载缓存
    await untilCbCalled(setTimeout, 100);
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      expect(!!cache).toBeTruthy();
      return false;
    });
    setCacheData(getter(page.value - 1, pageSize.value), cache => {
      expect(!!cache).toBeTruthy();
      return false;
    });

    // 最后一页
    page.value = pageCount.value;
    await untilCbCalled(onSuccess);
    expect(isLastPage.value).toBeTruthy();
    // 检查预加载缓存
    await untilCbCalled(setTimeout, 100);
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      expect(!!cache).toBeFalsy();
      return false;
    });
    setCacheData(getter(page.value - 1, pageSize.value), cache => {
      expect(!!cache).toBeTruthy();
      return false;
    });
  });

  test('paginated data with conditions search', async () => {
    const alovaInst = createMockAlova();
    const getter = (page, pageSize, keyword) =>
      alovaInst.Get('/list-with-search', {
        params: {
          page,
          pageSize,
          keyword
        }
      });
    const keyword = ref('');
    const { page, data, onSuccess, total } = usePagination((p, ps) => getter(p, ps, keyword.value), {
      watchingStates: [keyword],
      total: res => res.total,
      data: res => res.list
    });

    await untilCbCalled(onSuccess);
    expect(data.value[0]).toEqual({ id: 0, word: 'aaa' });
    expect(data.value[data.value.length - 1]).toEqual({ id: 9, word: 'aaa' });
    expect(total.value).toBe(300);

    page.value++;
    await untilCbCalled(onSuccess);
    expect(data.value[0]).toEqual({ id: 10, word: 'bbb' });
    expect(data.value[data.value.length - 1]).toEqual({ id: 19, word: 'bbb' });
    expect(total.value).toBe(300);

    keyword.value = 'bbb';
    await untilCbCalled(onSuccess);
    data.value.forEach(({ word }) => expect(word).toBe('bbb'));
    expect(data.value[0]).toEqual({ id: 1, word: 'bbb' });
    expect(total.value).toBe(100);
  });

  test('paginated data refersh page', async () => {
    const alovaInst = createMockAlova();
    const getter = (page, pageSize) =>
      alovaInst.Get('/list', {
        params: {
          page,
          pageSize
        }
      });

    const { data, page, pageSize, onSuccess, refresh } = usePagination(getter, {
      total: res => res.total,
      data: res => res.list
    });

    await untilCbCalled(onSuccess);
    page.value = 3;

    await untilCbCalled(onSuccess);
    setMockListData(data => {
      data.splice(20, 1, 200);
      return data;
    });

    refresh(3);
    await untilCbCalled(onSuccess);
    expect(data.value).toEqual([200, 21, 22, 23, 24, 25, 26, 27, 28, 29]);

    setMockListData(data => {
      data.splice(0, 1, 100);
      return data;
    });
    refresh(1); // 在翻页模式下，不是当前页会使用fetch，因此只能使用setTimeout
    await untilCbCalled(setTimeout, 100);
    setCacheData(getter(1, pageSize.value), cache => {
      expect(cache.list).toEqual([100, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      return false;
    });
  });

  test('paginated data insert item with preload', async () => {
    const alovaInst = createMockAlova();
    const getter = (page, pageSize) =>
      alovaInst.Get('/list', {
        params: {
          page,
          pageSize
        }
      });

    const { data, page, pageSize, total, insert, onFetchSuccess } = usePagination(getter, {
      data: res => res.list,
      initialPage: 2 // 默认从第2页开始
    });

    await untilCbCalled(setTimeout, 150); // 预留请求和fetch的时间

    // 检查预加载缓存
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      expect(!!cache).toBeTruthy();
      return false;
    });
    setCacheData(getter(page.value - 1, pageSize.value), cache => {
      expect(!!cache).toBeTruthy();
      return false;
    });

    let totalPrev = total.value;
    insert(300, 0);
    expect(data.value).toEqual([300, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(total.value).toBe((totalPrev = totalPrev + 1));
    setMockListData(data => {
      data.splice(10, 0, 300);
      return data;
    });
    // 检查当前页缓存
    setCacheData(getter(page.value, pageSize.value), cache => {
      expect(cache.list).toEqual([300, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
      return false;
    });
    // 检查是否重新fetch了前后一页的数据
    setCacheData(getter(page.value - 1, pageSize.value), cache => {
      expect(cache.list).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      return false;
    });
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      // insert时不会将缓存末尾去掉，因此剩下11项
      expect(cache.list).toEqual([19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
      return false;
    });
    await untilCbCalled(setTimeout, 150);
    // 检查是否重新fetch了前后一页的数据
    setCacheData(getter(page.value - 1, pageSize.value), cache => {
      expect(cache.list).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      return false;
    });
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      // 重新fetch后还是保持pageSize项数据
      expect(cache.list).toEqual([19, 20, 21, 22, 23, 24, 25, 26, 27, 28]);
      return false;
    });

    insert(400);
    insert(500, 2);
    insert(600, pageSize.value - 1);
    expect(total.value).toBe((totalPrev = totalPrev + 3));
    expect(data.value).toEqual([400, 300, 500, 10, 11, 12, 13, 14, 15, 600]);
    // 当前页缓存要保持一致
    setCacheData(getter(page.value, pageSize.value), cache => {
      expect(cache.list).toEqual([400, 300, 500, 10, 11, 12, 13, 14, 15, 600]);
      return false;
    });

    const mockFn2 = jest.fn();
    onFetchSuccess(mockFn2);
    await untilCbCalled(setTimeout, 100);
    expect(mockFn2.mock.calls.length).toBe(1); // 只会重新预加载下一页数据
  });

  test('paginated data replace item', async () => {
    const alovaInst = createMockAlova();
    const getter = (page, pageSize) =>
      alovaInst.Get('/list', {
        params: {
          page,
          pageSize
        }
      });

    const { data, page, pageSize, replace } = usePagination(getter, {
      data: res => res.list
    });

    await untilCbCalled(setTimeout, 150); // 预留请求和fetch的时间

    expect(() => {
      replace(100);
    }).toThrowError();
    expect(() => {
      replace(100, 1000);
    }).toThrowError();

    replace(300, 0);
    expect(data.value).toEqual([300, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // 检查当前页缓存
    setCacheData(getter(page.value, pageSize.value), cache => {
      expect(cache.list).toEqual([300, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      return false;
    });

    // 正向顺序替换
    replace(400, 8);
    expect(data.value).toEqual([300, 1, 2, 3, 4, 5, 6, 7, 400, 9]);
    // 逆向顺序替换
    replace(500, -4);
    expect(data.value).toEqual([300, 1, 2, 3, 4, 5, 500, 7, 400, 9]);
  });

  test('paginated data insert item without preload', async () => {
    const alovaInst = createMockAlova();
    const getter = (page, pageSize) =>
      alovaInst.Get('/list', {
        params: {
          page,
          pageSize
        }
      });

    const { data, page, pageSize, insert, onSuccess } = usePagination(getter, {
      data: res => res.list,
      preloadNextPage: false,
      preloadPreviousPage: false,
      initialPage: 2 // 默认从第2页开始
    });

    await untilCbCalled(onSuccess, 150); // 预留请求和fetch的时间

    // 检查预加载缓存
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      expect(!!cache).toBeFalsy();
      return false;
    });
    setCacheData(getter(page.value - 1, pageSize.value), cache => {
      expect(!!cache).toBeFalsy();
      return false;
    });

    setMockListData(data => {
      data.splice(20, 1, 122);
      return data;
    });
    insert(300);
    expect(data.value).toEqual([300, 10, 11, 12, 13, 14, 15, 16, 17, 18]);

    // 预加载设置为false了，因此不会fetch前后一页的数据
    await untilCbCalled(setTimeout, 100);
    setCacheData(getter(page.value - 1, pageSize.value), cache => {
      expect(!!cache).toBeFalsy();
      return false;
    });
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      expect(!!cache).toBeFalsy();
      return false;
    });
  });

  test('paginated data remove item with preload', async () => {
    const alovaInst = createMockAlova();
    const getter = (page, pageSize) =>
      alovaInst.Get('/list', {
        params: {
          page,
          pageSize
        }
      });

    const { data, page, pageSize, total, remove, onFetchSuccess } = usePagination(getter, {
      data: res => res.list,
      initialPage: 2, // 默认从第2页开始
      initialPageSize: 4
    });

    await untilCbCalled(setTimeout, 150); // 预留请求和fetch的时间

    // 检查预加载缓存
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      expect(!!cache).toBeTruthy();
      return false;
    });
    setCacheData(getter(page.value - 1, pageSize.value), cache => {
      expect(!!cache).toBeTruthy();
      return false;
    });

    let totalPrev = total.value;
    // 删除第二项，将会用下一页的数据补位，并重新拉取上下一页的数据
    remove(1);
    remove(1);
    expect(data.value).toEqual([4, 7, 8, 9]);
    expect(total.value).toBe((totalPrev = totalPrev - 2));
    setMockListData(data => {
      // 模拟数据中同步删除，这样fetch的数据校验才正常
      data.splice(5, 2);
      return data;
    });
    // 当前页缓存要保持一致
    setCacheData(getter(page.value, pageSize.value), cache => {
      expect(cache.list).toEqual([4, 7, 8, 9]);
      return false;
    });

    const mockFn = jest.fn();
    onFetchSuccess(mockFn);

    // 请求发送了，但还没响应（响应有50ms延迟），此时再一次删除，期望还可以使用原缓存且中断请求
    await untilCbCalled(setTimeout);
    remove(2);
    setMockListData(data => {
      data.splice(6, 1);
      return data;
    });
    expect(data.value).toEqual([4, 7, 9, 10]);
    expect(total.value).toBe((totalPrev = totalPrev - 1));
    // 检查下一页缓存
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      expect(cache.list).toEqual([11]); // 已经被使用了3项了
      return false;
    });

    await untilCbCalled(setTimeout, 100); // 等待重新fetch
    expect(data.value).toEqual([4, 7, 9, 10]);
    expect(mockFn.mock.calls.length).toBe(1); // 有一次下页的fetch被取消，因此只有一次
    // 检查是否重新fetch了前后一页的数据
    await untilCbCalled(setTimeout, 100);
    setCacheData(getter(page.value - 1, pageSize.value), cache => {
      expect(cache.list).toEqual([0, 1, 2, 3]);
      return false;
    });
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      expect(cache.list).toEqual([11, 12, 13, 14]);
      return false;
    });

    // 同步操作的项数超过pageSize时，移除的数据将被恢复，并重新请求当前页数据
    remove(0);
    remove(0);
    remove(0);
    remove(0);
    remove(0);
    expect(data.value).toEqual([4, 7, 9, 10]); // 数据被恢复
    setMockListData(data => {
      // 模拟数据中同步删除
      data.splice(4, 5);
      return data;
    });
    const mockFn2 = jest.fn();
    onFetchSuccess(mockFn2);

    await untilCbCalled(setTimeout, 100);
    expect(data.value).toEqual([12, 13, 14, 15]);
    expect(total.value).toBe((totalPrev = totalPrev - 5));
    expect(mockFn2.mock.calls.length).toBe(1); // 只有下页的预加载触发
    setCacheData(getter(page.value - 1, pageSize.value), cache => {
      expect(cache.list).toEqual([0, 1, 2, 3]);
      return false;
    });
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      expect(cache.list).toEqual([16, 17, 18, 19]);
      return false;
    });
  });

  test('paginated data remove short list item without preload', async () => {
    const alovaInst = createMockAlova();
    const getter = (page, pageSize) =>
      alovaInst.Get('/list-short', {
        params: {
          page,
          pageSize
        }
      });

    const { data, page, pageSize, total, remove, onSuccess } = usePagination(getter, {
      data: res => res.list,
      total: res => res.total,
      initialPage: 3, // 默认从第3页开始
      initialPageSize: 4,
      preloadNextPage: false,
      preloadPreviousPage: false
    });

    await untilCbCalled(onSuccess);
    let totalPrev = total.value;
    remove(1);
    setMockShortListData(data => {
      // 模拟数据中同步删除，这样fetch的数据校验才正常
      data.splice(9, 1);
      return data;
    });
    expect(data.value).toEqual([8]);
    expect(total.value).toBe((totalPrev = totalPrev - 1));
    // 当前页缓存要保持一致
    setCacheData(getter(page.value, pageSize.value), cache => {
      expect(cache.list).toEqual([8]);
      return false;
    });

    remove(0);
    setMockShortListData(data => {
      data.splice(8, 1);
      return data;
    });
    await untilCbCalled(onSuccess); // 最后一页没有数据项了，自动设置为前一页
    expect(page.value).toBe(2);
    expect(data.value).toEqual([4, 5, 6, 7]);
    expect(total.value).toBe(totalPrev - 1);
  });

  // 下拉加载更多相关
  test('load more mode paginated data. and change page/pageSize', async () => {
    const alovaInst = createMockAlova();
    const getter = (page, pageSize) =>
      alovaInst.Get('/list', {
        params: {
          page,
          pageSize
        }
      });

    const { data, page, pageSize, isLastPage, onSuccess } = usePagination(getter, {
      total: () => undefined,
      data: res => res.list,
      append: true,
      preloadNextPage: false,
      preloadPreviousPage: false
    });

    await untilCbCalled(onSuccess);
    expect(page.value).toBe(1);
    expect(pageSize.value).toBe(10);
    expect(data.value.length).toBe(pageSize.value);
    expect(data.value[0]).toBe(0);
    expect(isLastPage.value).toBeFalsy();

    // 检查预加载缓存
    await untilCbCalled(setTimeout, 100);
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      expect(!!cache).toBeFalsy();
      return false;
    });

    page.value++;
    await untilCbCalled(onSuccess);
    expect(page.value).toBe(2);
    expect(pageSize.value).toBe(10);
    expect(data.value.length).toBe(pageSize.value * 2);
    expect(data.value[0]).toBe(0);
    expect(data.value[data.value.length - 1]).toBe(19);
    expect(isLastPage.value).toBeFalsy();

    // 检查预加载缓存
    await untilCbCalled(setTimeout, 100);
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      expect(!!cache).toBeFalsy();
      return false;
    });

    // 最后一页
    page.value = 31;
    await untilCbCalled(onSuccess);
    expect(isLastPage.value).toBeTruthy();
  });

  test('load more paginated data with conditions search', async () => {
    const alovaInst = createMockAlova();
    const getter = (page, pageSize, keyword) =>
      alovaInst.Get('/list-with-search', {
        params: {
          page,
          pageSize,
          keyword
        }
      });
    const keyword = ref('');
    const { page, data, onSuccess } = usePagination((p, ps) => getter(p, ps, keyword.value), {
      watchingStates: [keyword],
      total: () => undefined,
      data: res => res.list,
      append: true
    });

    await untilCbCalled(onSuccess);
    expect(data.value[0]).toEqual({ id: 0, word: 'aaa' });
    expect(data.value[data.value.length - 1]).toEqual({ id: 9, word: 'aaa' });

    page.value++;
    await untilCbCalled(onSuccess);
    expect(data.value.length).toBe(20);
    expect(data.value[0]).toEqual({ id: 0, word: 'aaa' });
    expect(data.value[data.value.length - 1]).toEqual({ id: 19, word: 'bbb' });

    keyword.value = 'bbb';
    await untilCbCalled(onSuccess);
    data.value.forEach(({ word }) => expect(word).toBe('bbb'));
    expect(data.value[0]).toEqual({ id: 1, word: 'bbb' });
    expect(data.value.length).toBe(10);
  });

  test('load more mode paginated data refersh page', async () => {
    const alovaInst = createMockAlova();
    const getter = (page, pageSize) =>
      alovaInst.Get('/list', {
        params: {
          page,
          pageSize
        }
      });

    const { data, page, onSuccess, refresh } = usePagination(getter, {
      total: () => undefined,
      data: res => res.list,
      append: true,
      preloadNextPage: false,
      preloadPreviousPage: false
    });

    await untilCbCalled(onSuccess);
    expect(data.value[0]).toBe(0);
    expect(data.value[data.value.length - 1]).toBe(9);

    page.value++;
    await untilCbCalled(onSuccess);
    expect(data.value[0]).toBe(0);
    expect(data.value[data.value.length - 1]).toBe(19);

    setMockListData(data => {
      data.splice(0, 1, 100);
      return data;
    });

    expect(() => {
      refresh(100);
    }).toThrowError();

    refresh(1);
    await untilCbCalled(onSuccess); // append模式下将使用send函数重新请求数据
    expect(data.value[0]).toBe(100);
    expect(data.value[data.value.length - 1]).toBe(19);
    expect(data.value.length).toBe(20);
  });

  test('load more mode paginated data operate items with remove/insert/replace(open preload)', async () => {
    const alovaInst = createMockAlova();
    const getter = (page, pageSize) =>
      alovaInst.Get('/list', {
        params: {
          page,
          pageSize
        }
      });

    const { data, page, total, pageCount, remove, insert, replace } = usePagination(getter, {
      total: () => undefined,
      data: res => res.list,
      initialPage: 2, // 默认从第2页开始
      initialPageSize: 4
    });

    await untilCbCalled(setTimeout, 150);
    expect(total.value).toBeUndefined();
    expect(pageCount.value).toBeUndefined();
    remove(1);
    remove(1);
    insert(100, 0);
    replace(200, 2);
    setMockListData(data => {
      // 模拟数据中同步删除，这样fetch的数据校验才正常
      data.splice(5, 2);
      data.splice(4, 0, 100);
      data.splice(6, 1, 200);
      return data;
    });
    expect(data.value).toEqual([100, 4, 200, 8]);
    expect(total.value).toBeUndefined();
    expect(pageCount.value).toBeUndefined();

    page.value++;
  });

  test('load more mode paginated data remove item without preload', async () => {
    const alovaInst = createMockAlova();
    const getter = (page, pageSize) =>
      alovaInst.Get('/list', {
        params: {
          page,
          pageSize
        }
      });

    const { data, page, pageSize, onSuccess, onFetchSuccess, remove } = usePagination(getter, {
      total: () => undefined,
      data: res => res.list,
      append: true,
      preloadNextPage: false,
      preloadPreviousPage: false,
      initialPageSize: 4
    });

    await untilCbCalled(onSuccess);
    expect(data.value).toEqual([0, 1, 2, 3]);

    // 下一页没有缓存的情况下，将会重新请求刷新列表
    remove(0);
    remove(0);
    setMockListData(data => {
      // 模拟数据中同步删除
      data.splice(0, 2);
      return data;
    });

    expect(data.value).toEqual([0, 1, 2, 3]);
    const mockFn = jest.fn();
    onFetchSuccess(mockFn);

    await untilCbCalled(setTimeout, 100);
    expect(data.value).toEqual([2, 3, 4, 5]);
    expect(mockFn.mock.calls.length).toBe(0);
    setCacheData(getter(page.value - 1, pageSize.value), cache => {
      expect(!!cache).toBeFalsy();
      return false;
    });
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      expect(!!cache).toBeFalsy();
      return false;
    });
  });

  test('load more mode reload paginated data', async () => {
    const alovaInst = createMockAlova();
    const getter = (page, pageSize) =>
      alovaInst.Get('/list', {
        params: {
          page,
          pageSize
        }
      });

    const { data, page, onSuccess, reload } = usePagination(getter, {
      total: () => undefined,
      data: res => res.list,
      append: true,
      initialPageSize: 4
    });

    await untilCbCalled(onSuccess);
    expect(data.value).toEqual([0, 1, 2, 3]);
    setMockListData(data => {
      data.splice(0, 1, 100);
      return data;
    });
    reload();
    await untilCbCalled(onSuccess);
    expect(data.value).toEqual([100, 1, 2, 3]);

    page.value++;
    await untilCbCalled(onSuccess);
    expect(data.value).toEqual([100, 1, 2, 3, 4, 5, 6, 7]);

    reload();
    await untilCbCalled(onSuccess);
    expect(data.value).toEqual([100, 1, 2, 3]);
  });

  test("load more mode paginated data don't need to preload when go to last page", async () => {
    const alovaInst = createMockAlova();
    const getter = (page, pageSize) =>
      alovaInst.Get('/list-short', {
        params: {
          page,
          pageSize
        }
      });

    const { data, page, pageSize, onSuccess } = usePagination(getter, {
      total: () => undefined,
      data: res => res.list,
      append: true,
      initialPage: 2,
      initialPageSize: 4
    });

    await untilCbCalled(onSuccess);
    expect(data.value).toEqual([4, 5, 6, 7]);

    page.value++;
    await untilCbCalled(onSuccess);
    expect(data.value).toEqual([4, 5, 6, 7, 8, 9]);

    // 已经到最后一页了，不需要再预加载下一页数据了
    await untilCbCalled(setTimeout, 100);
    setCacheData(getter(page.value + 1, pageSize.value), cache => {
      expect(cache).toBeUndefined();
    });
  });
});
