import { createAlova, setCacheData } from 'alova';
import VueHook from 'alova/vue';
import { ref } from 'vue';
import { usePagination } from '../../src/index-vue';
import { mockRequestAdapter, setMockListData, setMockListWithSearchData } from '../mockData';
import { untilCbCalled } from '../utils';

// 防止Vue warn打印
const warn = console.warn;
console.warn = (...args) => {
	args = args.filter(a => !/vue warn/i.test(a));
	if (args.length > 0) {
		warn.apply(console, args);
	}
};

beforeEach(() => setMockListData());
beforeEach(() => setMockListWithSearchData());
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
			pageCount: res => res.pageCount,
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
		const { page, data, onSuccess } = usePagination((p, ps) => getter(p, ps, keyword.value), {
			watchingStates: [keyword],
			total: res => res.total,
			pageCount: res => res.pageCount,
			data: res => res.list
		});

		await untilCbCalled(onSuccess);
		expect(data.value[0]).toEqual({ id: 0, word: 'aaa' });
		expect(data.value[data.value.length - 1]).toEqual({ id: 9, word: 'aaa' });

		page.value++;
		await untilCbCalled(onSuccess);
		expect(data.value[0]).toEqual({ id: 10, word: 'bbb' });
		expect(data.value[data.value.length - 1]).toEqual({ id: 19, word: 'bbb' });

		keyword.value = 'bbb';
		await untilCbCalled(onSuccess);
		data.value.forEach(({ word }) => expect(word).toBe('bbb'));
		expect(data.value[0]).toEqual({ id: 1, word: 'bbb' });
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
			pageCount: res => res.pageCount,
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

		const { data, page, pageSize, insert, onFetchSuccess } = usePagination(getter, {
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

		const mockFn = jest.fn();
		setMockListData(data => {
			data.splice(20, 1, 122);
			return data;
		});
		await new Promise(resolve => {
			insert(300, {
				index: 0,
				onBefore: () => {
					mockFn();
					expect(data.value).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
				},
				onAfter: () => {
					mockFn();
					expect(data.value).toEqual([300, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
					resolve();
				}
			});
		});
		expect(mockFn.mock.calls.length).toBe(2);

		// 检查是否重新fetch了前后一页的数据
		await untilCbCalled(setTimeout, 100);
		setCacheData(getter(page.value - 1, pageSize.value), cache => {
			expect(cache.list).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
			return false;
		});
		setCacheData(getter(page.value + 1, pageSize.value), cache => {
			expect(cache.list).toEqual([122, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
			return false;
		});

		const mockFn2 = jest.fn();
		insert(400);
		insert(500, { index: 2 });
		insert(600, { index: pageSize.value - 1 });
		onFetchSuccess(() => {
			mockFn2();
		});
		await untilCbCalled(setTimeout, 100);
		expect(data.value).toEqual([400, 300, 500, 10, 11, 12, 13, 14, 15, 600]);
		expect(mockFn2.mock.calls.length).toBe(2);
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

		const { data, page, pageSize, insert, onSuccess, onFetchSuccess } = usePagination(getter, {
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

		const mockFn = jest.fn();
		setMockListData(data => {
			data.splice(20, 1, 122);
			return data;
		});
		await new Promise(resolve => {
			insert(300, {
				index: 0,
				onBefore: () => {
					mockFn();
					expect(data.value).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
				},
				onAfter: () => {
					mockFn();
					expect(data.value).toEqual([300, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
					resolve();
				}
			});
		});
		expect(mockFn.mock.calls.length).toBe(2);

		// 检查是否重新fetch了前后一页的数据
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

		const { data, page, pageSize, remove, onFetchSuccess } = usePagination(getter, {
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

		const mockFn = jest.fn();
		// 删除第二项，将会用下一页的数据补位，并重新拉取上下一页的数据
		remove(1);
		remove(1);
		setMockListData(data => {
			// 模拟数据中同步删除，这样fetch的数据校验才正常
			data.splice(5, 2);
			return data;
		});
		onFetchSuccess(() => {
			mockFn();
		});
		await untilCbCalled(setTimeout, 100); // 等待重新fetch
		expect(data.value).toEqual([4, 7, 8, 9]);
		expect(mockFn.mock.calls.length).toBe(2);
		// 检查是否重新fetch了前后一页的数据
		await untilCbCalled(setTimeout, 100);
		setCacheData(getter(page.value - 1, pageSize.value), cache => {
			expect(cache.list).toEqual([0, 1, 2, 3]);
			return false;
		});
		setCacheData(getter(page.value + 1, pageSize.value), cache => {
			expect(cache.list).toEqual([10, 11, 12, 13]);
			return false;
		});

		const mockFn2 = jest.fn();
		// 同步操作的项数超过pageSize时，移除的数据将被恢复，并重新请求当前页数据
		remove(0);
		remove(0);
		remove(0);
		remove(0);
		remove(0);
		expect(data.value).toEqual([4, 7, 8, 9]); // 数据被恢复
		setMockListData(data => {
			// 模拟数据中同步删除
			data.splice(4, 5);
			return data;
		});
		onFetchSuccess(() => {
			mockFn2();
		});

		await untilCbCalled(setTimeout, 100);
		expect(data.value).toEqual([11, 12, 13, 14]);
		expect(mockFn2.mock.calls.length).toBe(2);
		setCacheData(getter(page.value - 1, pageSize.value), cache => {
			expect(cache.list).toEqual([0, 1, 2, 3]);
			return false;
		});
		setCacheData(getter(page.value + 1, pageSize.value), cache => {
			expect(cache.list).toEqual([15, 16, 17, 18]);
			return false;
		});
	});

	// 下拉加载更多相关
	test('load more mode paginated data, and change page/pageSize', async () => {
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
			pageCount: () => undefined,
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
			pageCount: () => undefined,
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
			pageCount: () => undefined,
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
			pageCount: () => undefined,
			data: res => res.list,
			append: true,
			preloadNextPage: false,
			preloadPreviousPage: false,
			initialPageSize: 4
		});

		await untilCbCalled(onSuccess);
		expect(data.value).toEqual([0, 1, 2, 3]);

		const mockFn = jest.fn();
		// 下一页没有缓存的情况下，将会重新请求刷新列表
		remove(0);
		remove(0);
		setMockListData(data => {
			// 模拟数据中同步删除
			data.splice(0, 2);
			return data;
		});

		expect(data.value).toEqual([0, 1, 2, 3]);
		onFetchSuccess(() => {
			mockFn();
		});

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
});
