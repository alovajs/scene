import { createAlovaMockAdapter, defineMock } from '@alova/mock';

const mocks = defineMock({
	'/list': ({ query }) => {
		const total = 300;
		const { page = 1, pageSize = 10 } = query;
		const start = (page - 1) * pageSize;
		const size = Math.min(total - start, pageSize);
		return {
			pageCount: Math.ceil(total / pageSize),
			total,
			list: Array.from({ length: size }).map((_, i) => i + start)
		};
	},

	'/list-with-search': ({ query }) => {
		const total = 300;
		const dataCollections = Array.from({ length: total }).map((_, i) => {
			let n = i % 3;
			return {
				id: i,
				word: ['aaa', 'bbb', 'ccc'][n]
			};
		});

		const { page = 1, pageSize = 10, keyword } = query;
		const start = (page - 1) * pageSize;
		return {
			pageCount: Math.ceil(total / pageSize),
			total,
			list: dataCollections.filter(({ word }) => keyword ? word === keyword : true).slice(start, start + pageSize),
		};
	},
});

// 模拟数据请求适配器
export const mockRequestAdapter = createAlovaMockAdapter([mocks], {
	delay: 50,
	onMockResponse: data => data,
	mockRequestLogger: false,
});
