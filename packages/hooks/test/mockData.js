import { createAlovaMockAdapter, defineMock } from '@alova/mock';

const total = 300;
let mockListData;
export const setMockListData = cb => {
	mockListData = typeof cb === 'function' ? cb(mockListData) : Array.from({ length: total }).map((_, i) => i);
};

let mockListWithSearchData;
export const setMockListWithSearchData = cb => {
	mockListWithSearchData =
		typeof cb === 'function'
			? cb(mockListWithSearchData)
			: Array.from({ length: total }).map((_, i) => {
					let n = i % 3;
					return {
						id: i,
						word: ['aaa', 'bbb', 'ccc'][n]
					};
			  });
};
setMockListData();
setMockListWithSearchData();

const mocks = defineMock({
	'/list': ({ query }) => {
		let { page = 1, pageSize = 10 } = query;
		page = Number(page);
		pageSize = Number(pageSize);
		const start = (page - 1) * pageSize;
		return {
			pageCount: Math.ceil(total / pageSize),
			total,
			list: mockListData.slice(start, start + pageSize)
		};
	},

	'/list-with-search': ({ query }) => {
		let { page = 1, pageSize = 10, keyword } = query;
		page = Number(page);
		pageSize = Number(pageSize);
		const start = (page - 1) * pageSize;
		return {
			pageCount: Math.ceil(total / pageSize),
			total,
			list: mockListWithSearchData
				.filter(({ word }) => (keyword ? word === keyword : true))
				.slice(start, start + pageSize)
		};
	}
});

// 模拟数据请求适配器
export const mockRequestAdapter = createAlovaMockAdapter([mocks], {
	delay: 50,
	onMockResponse: data => data,
	mockRequestLogger: false
});
