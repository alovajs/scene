import { createAlova, Method } from 'alova';
import VueHook from 'alova/vue';
import { setSilentFactoryStatus } from '../../src/hooks/silent/globalVariables';
import { bootSilentFactory } from '../../src/hooks/silent/silentFactory';
import { SilentMethod } from '../../src/hooks/silent/SilentMethod';
import { pushNewSilentMethod2Queue } from '../../src/hooks/silent/silentQueue';
import createVirtualResponse from '../../src/hooks/silent/virtualResponse/createVirtualResponse';
import { mockRequestAdapter } from '../mockData';

// 每次需重置状态，因为上一个用例可能因为失败而被设置为2，导致下面的用例不运行
beforeEach(() => setSilentFactoryStatus(0));
jest.setTimeout(1000000);
describe('silent method request in queue with silent behavior', () => {
  test('silentMethods in queue should delay request when set queueRequestDelay in bootSilentFactory', async () => {
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter
    });

    const methodInstance = new Method('POST', alovaInst, '/detail');
    const delayRequestTs = [] as number[];
    const pms = new Promise(resolve => {
      const virtualResponse = createVirtualResponse({
        id: ''
      });
      let startTs = Date.now();
      const silentMethodInstance = new SilentMethod(
        methodInstance,
        'silent',
        undefined,
        /.*/,
        0,
        undefined,
        undefined,
        () => {
          const curTs = Date.now();
          delayRequestTs.push(curTs - startTs);
          startTs = curTs;
        }
      );
      const silentMethodInstance2 = new SilentMethod(
        methodInstance,
        'silent',
        undefined,
        /.*/,
        0,
        undefined,
        undefined,
        value => {
          delayRequestTs.push(Date.now() - startTs);
          resolve(value);
        }
      );
      silentMethodInstance.virtualResponse = virtualResponse;
      pushNewSilentMethod2Queue(silentMethodInstance, false);
      pushNewSilentMethod2Queue(silentMethodInstance2, false);

      // 启动silentFactory
      bootSilentFactory({
        alova: alovaInst,
        delay: 0,
        queueRequestDelay: 1000
      });
    });

    await pms;
    // 延迟请求1000毫秒，请求时间50毫秒，因此检测点是1050毫秒
    expect(delayRequestTs[0]).toBeGreaterThanOrEqual(1050);
    expect(delayRequestTs[1]).toBeGreaterThanOrEqual(1050);
  });

  test('silentMethods in queue should delay request when set queueRequestDelay in bootSilentFactory', async () => {
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter
    });

    const queueName = 'ttt1';
    const methodInstance = new Method('POST', alovaInst, '/detail');
    const delayRequestTs = [] as number[];
    const pms = new Promise(resolve => {
      const virtualResponse = createVirtualResponse({
        id: ''
      });
      let startTs = Date.now();
      const silentMethodInstance = new SilentMethod(
        methodInstance,
        'silent',
        undefined,
        /.*/,
        0,
        undefined,
        undefined,
        () => {
          const curTs = Date.now();
          delayRequestTs.push(curTs - startTs);
          startTs = curTs;
        }
      );
      const silentMethodInstance2 = new SilentMethod(
        methodInstance,
        'silent',
        undefined,
        /.*/,
        0,
        undefined,
        undefined,
        value => {
          delayRequestTs.push(Date.now() - startTs);
          resolve(value);
        }
      );
      silentMethodInstance.virtualResponse = virtualResponse;
      pushNewSilentMethod2Queue(silentMethodInstance, false, queueName);
      pushNewSilentMethod2Queue(silentMethodInstance2, false, queueName);

      // 启动silentFactory
      bootSilentFactory({
        alova: alovaInst,
        delay: 0,
        queueRequestDelay: {
          [queueName]: 1000
        }
      });
    });

    await pms;
    // 延迟请求1000毫秒，请求时间50毫秒，因此检测点是1050毫秒
    expect(delayRequestTs[0]).toBeGreaterThanOrEqual(1050);
    expect(delayRequestTs[1]).toBeGreaterThanOrEqual(1050);
  });

  test('silentMethods in queue should delay request when set queueRequestDelay in bootSilentFactory', async () => {
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter
    });

    const queueName = 'ttt2';
    const methodInstance = new Method('POST', alovaInst, '/detail');
    const delayRequestTs = [] as number[];
    const pms = new Promise(resolve => {
      const virtualResponse = createVirtualResponse({
        id: ''
      });
      let startTs = Date.now();
      const silentMethodInstance = new SilentMethod(
        methodInstance,
        'silent',
        undefined,
        /.*/,
        0,
        undefined,
        undefined,
        () => {
          const curTs = Date.now();
          delayRequestTs.push(curTs - startTs);
          startTs = curTs;
        }
      );
      const silentMethodInstance2 = new SilentMethod(
        methodInstance,
        'silent',
        undefined,
        /.*/,
        0,
        undefined,
        undefined,
        value => {
          delayRequestTs.push(Date.now() - startTs);
          resolve(value);
        }
      );
      silentMethodInstance.virtualResponse = virtualResponse;
      pushNewSilentMethod2Queue(silentMethodInstance, false, queueName);
      pushNewSilentMethod2Queue(silentMethodInstance2, false, queueName);

      // 启动silentFactory
      bootSilentFactory({
        alova: alovaInst,
        delay: 0,

        // 注意：这边未指定queue名为ttt2的请求延迟，因此会立即请求
        queueRequestDelay: 1000
      });
    });

    await pms;
    // 未指定ttt2队列的延迟请求，因此会立即请求,100毫秒为请求延迟
    expect(delayRequestTs[0]).toBeLessThanOrEqual(100);
    expect(delayRequestTs[1]).toBeLessThanOrEqual(100);
  });
});
