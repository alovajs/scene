import { createAlova, Method } from 'alova';
import VueHook from 'alova/vue';
import { globalVirtualResponseLock } from '../../src/hooks/silent/globalVariables';
import { bootSilentFactory, onSilentSubmitComplete, onSilentSubmitError } from '../../src/hooks/silent/silentFactory';
import { SilentMethod } from '../../src/hooks/silent/SilentMethod';
import { pushNewSilentMethod2Queue } from '../../src/hooks/silent/silentQueue';
import createVirtualResponse from '../../src/hooks/silent/virtualTag/createVirtualResponse';
import { mockRequestAdapter } from '../mockData';
import { untilCbCalled } from '../utils';

describe('silent method request in queue', () => {
	test.only('it will regenerate a method instance when methodHandler exists', async () => {
		const alovaInst = createAlova({
			baseURL: 'http://xxx',
			statesHook: VueHook,
			requestAdapter: mockRequestAdapter
		});
		const pms = new Promise<void>(resolve => {
			globalVirtualResponseLock.v = 0;
			const virtualResponse = createVirtualResponse({
				id: ''
			});
			const methodInstance = new Method('POST', alovaInst, '/detail-delay');
			const silentMethodInstance = new SilentMethod(methodInstance, false, 'silent', undefined, 2, 200, 1000, [
				() => {
					console.log('fallback called');
					resolve();
				}
			]);
			silentMethodInstance.virtualResponse = virtualResponse;
			globalVirtualResponseLock.v = 2;
			pushNewSilentMethod2Queue(silentMethodInstance);

			// 启动silentFactory
			bootSilentFactory({
				alova: alovaInst,
				delay: 0
			});
		});

		const completeMockFn = jest.fn();
		onSilentSubmitComplete(e => {
			completeMockFn();
			console.log('submit complete');
		});
		const errorMockFn = jest.fn();
		onSilentSubmitError(e => {
			errorMockFn();
			console.log('submit error');
		});

		await pms;
		await untilCbCalled(setTimeout, 200);
	});
});
