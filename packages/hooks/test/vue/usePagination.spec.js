import { createAlova } from 'alova';
import VueHook from 'alova/vue';
import { usePagination } from '../../src/index-vue';
import { mockRequestAdapter } from '../mockData';

const alovaInst = createAlova({
	baseURL: 'http://localhost:8080',
	statesHook: VueHook,
	requestAdapter: mockRequestAdapter
});
describe('vue usePagination', () => {
	test('load paginated data and change page/pageSize', () => {
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

		onSuccess(rawData => {
			console.log(rawData);
			console.log(data, pageCount, total, page, pageSize, isLastPage);
		});
	});
});
