import { createAlova } from 'alova';
import GlobalFetch from 'alova/GlobalFetch';
import VueHook from 'alova/vue';
import { ref } from 'vue';
import usePagination from '../../src/core/usePagination';

const alovaInst = createAlova({
	baseURL: 'http://localhost:8080',
	statesHook: VueHook,
	requestAdapter: GlobalFetch()
});
describe('vue usePagination', () => {
	test('', () => {
		const getter = () =>
			alovaInst.Get('/test-get', {
				transformData: (data: { data: { a: string; b: string } }) => data
			});

		const { data, pageCount, total, page, pageSize, isLastPage } = usePagination(getter, {
			watchingStates: [ref(1), ref('a')]
			// data(data) {
			// 	return data.data.a;
			// }
		});
		console.log(data, pageCount, total, page, pageSize, isLastPage);
	});
});
