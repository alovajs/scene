import { createAlovaMockAdapter, defineMock } from '@alova/mock';

const mocks = defineMock({
	'/list': ({ query }) => {
		const total = 300;
		const { page = 1, pageSize = 10 } = query;
		const start = page - 1 * pageSize;
		return {
			pageCount: Math.ceil(total / pageSize),
			total,
			list: Array.from({ length: pageSize }).map((_, i) => i + start)
		};
	}
});

// 模拟数据请求适配器
export const mockRequestAdapter = createAlovaMockAdapter([mocks], {
	delay: 50
});
