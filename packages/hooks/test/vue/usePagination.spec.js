import { createAlova, setCacheData } from 'alova';
import VueHook from 'alova/vue';
import { ref } from 'vue';
import { usePagination } from '../../src/index-vue';
import { mockRequestAdapter } from '../mockData';
import { untilCbCalled } from '../utils';

// 防止Vue warn打印
const warn = console.warn;
console.warn = (...args) => {
	args = args.filter(a => !/vue warn/i.test(a));
	if (args.length > 0) {
		warn.apply(console, args);
	}
};

const alovaInst = createAlova({
	baseURL: 'http://localhost:8080',
	statesHook: VueHook,
	requestAdapter: mockRequestAdapter,
});
describe('vue usePagination', () => {
	test('load paginated data and change page/pageSize', async () => {
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
			expect(cache).toBeUndefined;
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

		// 最后一页
		page.value = pageCount.value;
		await untilCbCalled(onSuccess);
		expect(isLastPage.value).toBeTruthy();
	});

	test('load paginated data with append mode, and change page/pageSize', async () => {
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
		});

		await untilCbCalled(onSuccess);
		expect(page.value).toBe(1);
		expect(pageSize.value).toBe(10);
		expect(data.value.length).toBe(pageSize.value);
		expect(data.value[0]).toBe(0);
		expect(isLastPage.value).toBeFalsy();

		page.value++;
		await untilCbCalled(onSuccess);
		expect(page.value).toBe(2);
		expect(pageSize.value).toBe(10);
		expect(data.value.length).toBe(pageSize.value * 2);
		expect(data.value[0]).toBe(0);
		expect(data.value[data.value.length - 1]).toBe(19);
		expect(isLastPage.value).toBeFalsy();

		// 最后一页
		page.value = 31;
		await untilCbCalled(onSuccess);
		expect(isLastPage.value).toBeTruthy();
	});

	test('paginated data with conditions search', async () => {
		const getter = (page, pageSize, keyword) =>
			alovaInst.Get('/list-with-search', {
				params: {
					page,
					pageSize,
					keyword
				}
			});

		const keyword = ref('');
		const { data, onSuccess } = usePagination((p, ps) => getter(p, ps, keyword.value), {
			watchingStates: [keyword],
			total: res => res.total,
			pageCount: res => res.pageCount,
			data: res => res.list
		});

		await untilCbCalled(onSuccess);
		expect(data.value[0]).toEqual({ id: 0, word: 'aaa' });
		expect(data.value[data.value.length - 1]).toEqual({ id: 9, word: 'aaa' });

		keyword.value = 'bbb';
		await untilCbCalled(onSuccess);
		data.value.forEach(({ word }) => expect(word).toBe('bbb'));
	});

	test('refersh page', async () => {

	});

	test('insert item, preload and no preload', async () => {

	});

	test('remove item, preload and no preload', async () => {

	});
});
