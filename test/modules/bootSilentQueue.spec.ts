import { createAlova, Method } from 'alova';
import VueHook from 'alova/vue';
import { globalVirtualResponseLock } from '../../src/hooks/silent/globalVariables';
import {
	bootSilentFactory,
	onSilentSubmitBoot,
	onSilentSubmitComplete,
	onSilentSubmitSuccess
} from '../../src/hooks/silent/silentFactory';
import { SilentMethod } from '../../src/hooks/silent/SilentMethod';
import { pushNewSilentMethod2Queue } from '../../src/hooks/silent/silentQueue';
import createVirtualResponse from '../../src/hooks/silent/virtualTag/createVirtualResponse';
import { replaceVTag } from '../../src/hooks/silent/virtualTag/helper';
import vtagStringify from '../../src/hooks/silent/virtualTag/vtagStringify';
import { mockRequestAdapter } from '../mockData';
import { untilCbCalled } from '../utils';

describe('boot silent queue', () => {
	test('replace vtag to real data', () => {
		const virtualResponse = createVirtualResponse({ id: 'loading...' });
		const methodInstance = new Method(
			'DELETE',
			createAlova({
				baseURL: 'http://xxx',
				statesHook: VueHook,
				requestAdapter: mockRequestAdapter
			}),
			`/detail/${vtagStringify(virtualResponse.id)}`,
			{
				transformData: (data: any) => data
			},
			{ whole: virtualResponse, text: virtualResponse.text }
		);

		const virtualTagReplacedResponseMap = {
			[vtagStringify(virtualResponse)]: { id: 1 },
			[vtagStringify(virtualResponse.id)]: 1
		};
		const { r: replace } = replaceVTag(methodInstance, virtualTagReplacedResponseMap);
		expect(replace).toBeTruthy();
		expect(methodInstance.url).toBe('/detail/1');
		expect(methodInstance.requestBody).toEqual({
			whole: { id: 1 },
			text: undefined
		});

		// 不存在虚拟标签
		const methodInstance2 = new Method(
			'DELETE',
			createAlova({
				baseURL: 'http://xxx',
				statesHook: VueHook,
				requestAdapter: mockRequestAdapter
			}),
			`/detail`,
			{
				transformData: (data: any) => data
			},
			{ whole: { id: 123 }, text: '' }
		);
		const { r: replace2 } = replaceVTag(methodInstance2, virtualTagReplacedResponseMap);
		expect(replace2).toBeFalsy();
		expect(methodInstance2.url).toBe('/detail');
		expect(methodInstance2.requestBody).toEqual({
			whole: { id: 123 },
			text: ''
		});
	});

	test.only('1111', async () => {
		const alovaInst = createAlova({
			baseURL: 'http://xxx',
			statesHook: VueHook,
			requestAdapter: mockRequestAdapter
		});

		const pms = new Promise(resolve => {
			globalVirtualResponseLock.v = 0;
			const virtualResponse = createVirtualResponse({ id: 'loading...' });

			// 模拟数据创建
			const methodInstance = new Method(
				'POST',
				alovaInst,
				'/detail',
				{
					transformData: (data: any) => data
				},
				{ text: 'some content', time: new Date().toLocaleString() }
			);
			const silentMethodInstance = new SilentMethod(
				methodInstance,
				false,
				'silent',
				'abcdef',
				0,
				100,
				0,
				[
					() => {
						console.log('fallback');
					}
				],
				value => {
					console.log('resolve', value);
				},
				reason => {
					console.log('reject', reason);
				}
			);
			silentMethodInstance.virtualResponse = virtualResponse;

			// 模拟数据删除
			const methodInstance2 = new Method(
				'DELETE',
				alovaInst,
				'/detail',
				{
					transformData: (data: any) => data
				},
				{ id: virtualResponse.id }
			);
			const silentMethodInstance2 = new SilentMethod(
				methodInstance2,
				false,
				'silent',
				'abcdef',
				0,
				100,
				0,
				[
					() => {
						console.log('fallback');
					}
				],
				value => {
					console.log('resolve', value);
					resolve(1);
				},
				reason => {
					console.log('reject', reason);
				},
				undefined,
				undefined,
				[virtualResponse.id]
			);
			globalVirtualResponseLock.v = 2;

			pushNewSilentMethod2Queue(silentMethodInstance);
			pushNewSilentMethod2Queue(silentMethodInstance2);
			const bootMockFn = jest.fn();
			onSilentSubmitBoot(() => {
				bootMockFn();
			});
			const successMockFn = jest.fn();
			onSilentSubmitSuccess(event => {
				successMockFn();
				// TODO: 验证event内的数据
			});
			const completeMockFn = jest.fn();
			onSilentSubmitComplete(event => {
				completeMockFn();
				// TODO: 验证event内的数据
			});

			// 启动silentFactory
			bootSilentFactory({
				alova: alovaInst,
				delay: 0
			});
		});

		await pms;
		await untilCbCalled(setTimeout, 1000);
	});

	test('不带返回数据时的替换情况', async () => {});
	test('带基本数据时的替换情况', async () => {});
	test('带数组数据时的替换情况', async () => {});
});
