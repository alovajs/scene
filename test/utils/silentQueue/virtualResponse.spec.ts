import createVirtualResponse from '../../../src/hooks/silent/virtualTag/createVirtualResponse';
import { Undefined } from '../../../src/hooks/silent/virtualTag/Undefined';

// 虚拟响应测试
describe('virtual response', () => {
	test.only('create virtual response with object', async () => {
		const virtualTagLocked = { v: false };
		const virtualResponse = createVirtualResponse({}, virtualTagLocked);

		virtualResponse.a;
		virtualResponse.b.b1;
		virtualResponse.c[0];
		console.log(virtualResponse);
		expect(virtualResponse.a).toBeInstanceOf(Undefined);
		expect(virtualResponse.a.b1).toBeInstanceOf(Undefined);
		expect(virtualResponse.c[0]).toBeInstanceOf(Undefined);
	});
});
