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
	test('should emit fallback event when retry times are reached', async () => {
		const alovaInst = createAlova({
			baseURL: 'http://xxx',
			statesHook: VueHook,
			requestAdapter: mockRequestAdapter
		});

		const fallbackMockFn = jest.fn();
		const retryMockFn = jest.fn();
		const executeOrder = [] as string[]; // 用于记录执行顺序，后续验证
		const pms = new Promise<void>(resolve => {
			globalVirtualResponseLock.v = 0;
			const virtualResponse = createVirtualResponse({
				id: ''
			});
			const methodInstance = new Method('POST', alovaInst, '/detail-delay');
			let startTs = Date.now();
			const silentMethodInstance = new SilentMethod(
				methodInstance,
				false,
				'silent',
				undefined,
				2,
				50,
				200,
				[
					() => {
						executeOrder.push('fallback');
						fallbackMockFn();
					}
				],
				value => {
					resolve(value);
				},
				undefined,
				undefined,
				undefined,
				undefined,
				[
					event => {
						const endTs = Date.now();
						executeOrder.push(`retried_${event.retriedTimes}`);
						retryMockFn();

						expect(event.behavior).toBe('silent');
						expect(event.method).toBe(methodInstance);
						expect(event.silentMethod).toBe(silentMethodInstance);
						expect(event.retriedTimes).toBeLessThanOrEqual(2);
						expect(endTs - startTs).toBeGreaterThanOrEqual(45); // 测试过程中发现延迟到达不了50，会少一点点
						startTs = endTs;
					}
				]
			);
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
			// TODO: 两次都响应了，如何处理？
			console.log('submit complete');
		});
		const errorMockFn = jest.fn();
		onSilentSubmitError(e => {
			errorMockFn();
			console.log('submit error');
		});

		const ret = await pms;
		console.log('result', ret);
		await untilCbCalled(setTimeout, 200);
		// 有fallback回调时，不会触发nextRound
		expect(fallbackMockFn).toBeCalledTimes(1);
		expect(retryMockFn).toBeCalledTimes(2);
		expect(executeOrder).toEqual(['retried_1', 'retried_2', 'fallback']);
	});

	test('should emit global error event and never retry when request is error', async () => {
		const alovaInst = createAlova({
			baseURL: 'http://xxx',
			statesHook: VueHook,
			requestAdapter: mockRequestAdapter
		});

		const fallbackMockFn = jest.fn();
		const retryMockFn = jest.fn();
		const executeOrder = [] as string[]; // 用于记录执行顺序，后续验证
		const pms = new Promise<void>(resolve => {
			globalVirtualResponseLock.v = 0;
			const virtualResponse = createVirtualResponse({
				id: ''
			});
			const methodInstance = new Method('POST', alovaInst, '/detail-delay');
			let startTs = Date.now();
			const silentMethodInstance = new SilentMethod(
				methodInstance,
				false,
				'silent',
				undefined,
				2,
				50,
				200,
				[
					() => {
						executeOrder.push('fallback');
						fallbackMockFn();
					}
				],
				value => {
					resolve(value);
				},
				undefined,
				undefined,
				undefined,
				undefined,
				[
					event => {
						const endTs = Date.now();
						executeOrder.push(`retried_${event.retriedTimes}`);
						retryMockFn();

						expect(event.behavior).toBe('silent');
						expect(event.method).toBe(methodInstance);
						expect(event.silentMethod).toBe(silentMethodInstance);
						expect(event.retriedTimes).toBeLessThanOrEqual(2);
						expect(endTs - startTs).toBeGreaterThanOrEqual(45); // 测试过程中发现延迟到达不了50，会少一点点
						startTs = endTs;
					}
				]
			);
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
			// TODO: 两次都响应了，如何处理？
			console.log('submit complete');
		});
		const errorMockFn = jest.fn();
		onSilentSubmitError(e => {
			errorMockFn();
			console.log('submit error');
		});

		const ret = await pms;
		console.log('result', ret);
		await untilCbCalled(setTimeout, 200);
		// 有fallback回调时，不会触发nextRound
		expect(fallbackMockFn).toBeCalledTimes(1);
		expect(retryMockFn).toBeCalledTimes(2);
		expect(executeOrder).toEqual(['retried_1', 'retried_2', 'fallback']);
	});

	test('should emit global error event and never retry when throw error in global responsed interception', async () => {});

	test('should keep retrying when has no fallback handlers and nextRound is given', async () => {});
});
