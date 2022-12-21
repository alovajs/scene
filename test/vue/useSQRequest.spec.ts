import { createAlova } from 'alova';
import VueHook from 'alova/vue';
import { bootSilentFactory } from '../../src/hooks/silent/silentFactory';
import useSQRequest from '../../src/hooks/silent/useSQRequest';
import { mockRequestAdapter } from '../mockData';
import { untilCbCalled } from '../utils';

const alovaInst = createAlova({
	baseURL: 'http://xxx',
	statesHook: VueHook,
	requestAdapter: mockRequestAdapter
});
beforeAll(() => {
	bootSilentFactory({
		alova: alovaInst
	});
});

describe('useSQRequest', () => {
	test('init', async () => {
		const Get = alovaInst.Get('/list');
		const { data, onSuccess, onBeforePushQueue, onPushedQueue } = useSQRequest(Get);
		// TODO: middleware中同步存放silentMethod到队列，因此onBeforePushed事件在执行后才被绑定，需改正
		onBeforePushQueue(event => {
			console.log('before push', event);
		});
		onPushedQueue(event => {
			console.log('pushed queue', event);
		});
		await untilCbCalled(onSuccess);
		console.log(data);
	});
});
