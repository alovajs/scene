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

const shortTotal = 10;
let shortList;
export const setMockShortListData = cb => {
	shortList = typeof cb === 'function' ? cb(shortList) : Array.from({ length: shortTotal }).map((_, i) => i);
};

setMockListData();
setMockListWithSearchData();
setMockShortListData();

const mocks = defineMock({
	'/list': ({ query }) => {
		let { page = 1, pageSize = 10 } = query;
		page = Number(page);
		pageSize = Number(pageSize);
		const start = (page - 1) * pageSize;
		return {
			total: mockListData.length,
			list: mockListData.slice(start, start + pageSize)
		};
	},

	'/list-short': ({ query }) => {
		let { page = 1, pageSize = 10 } = query;
		page = Number(page);
		pageSize = Number(pageSize);
		const start = (page - 1) * pageSize;
		return {
			total: shortList.length,
			list: shortList.slice(start, start + pageSize)
		};
	},

	'/list-with-search': ({ query }) => {
		let { page = 1, pageSize = 10, keyword } = query;
		page = Number(page);
		pageSize = Number(pageSize);
		const start = (page - 1) * pageSize;
		const filteredList = mockListWithSearchData.filter(({ word }) => (keyword ? word === keyword : true));
		return {
			total: filteredList.length,
			list: filteredList.slice(start, start + pageSize)
		};
	},

	'[POST]/detail': () => {
		return {
			id: 1
		};
	},
	'[DELETE]/detail/{id}': ({ params, data }) => {
		return {
			params,
			data
		};
	},
	'[POST]/detail-delay': () => {
		return new Promise(resolve => {
			setTimeout(() => resolve({ id: 10 }), 2000);
		});
	}
});

// 模拟数据请求适配器
export const mockRequestAdapter = createAlovaMockAdapter([mocks], {
	delay: 50,
	onMockResponse: data => data,
	mockRequestLogger: false
});
