import { createAlova, Method } from 'alova';
import GlobalFetch from 'alova/GlobalFetch';
import VueHook from 'alova/vue';
import { globalVirtualResponseLock } from '../../src/hooks/silent/globalVariables';
import { mergeSerializer, serializers } from '../../src/hooks/silent/serializer';
import vtag from '../../src/hooks/silent/serializer/vtag';
import { SilentMethod } from '../../src/hooks/silent/SilentMethod';
import serializeSilentMethod from '../../src/hooks/silent/storage/serializeSilentMethod';
import createVirtualResponse from '../../src/hooks/silent/virtualTag/createVirtualResponse';

// 虚拟响应测试
describe('serializers', () => {
	test('merge serializers', () => {
		mergeSerializer({
			custom: {
				forward: data => (data === 'a,a' ? '2a' : undefined),
				backward: () => 'a,a'
			},
			_vtag_: {
				forward: () => undefined,
				backward: () => undefined
			}
		});

		// _vtag_内置的虚拟标签序列化器不能被替换
		expect(Object.keys(serializers)).toHaveLength(4);
		expect(serializers._vtag_).toBe(vtag);

		const methodInstance = new Method(
			'POST',
			createAlova({
				baseURL: 'http://xxx',
				statesHook: VueHook,
				requestAdapter: GlobalFetch()
			}),
			'/list',
			{},
			{ a: 1, b: 2 }
		);
		const silentMethodInstance = new SilentMethod(methodInstance, true, 'silent');
		globalVirtualResponseLock.v = false;
		const virtualResponse = createVirtualResponse({ a: 1 });
		virtualResponse.a;
		virtualResponse.b.c;
		virtualResponse.d[0];
		globalVirtualResponseLock.v = true;
		silentMethodInstance.virtualResponse = virtualResponse;
		const serializedString = serializeSilentMethod(silentMethodInstance);
		console.log(serializedString);
	});
});
