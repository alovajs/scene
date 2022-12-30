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
import createVirtualResponse from '../../src/hooks/silent/virtualResponse/createVirtualResponse';
import { deepReplaceVTag } from '../../src/hooks/silent/virtualResponse/helper';
import vtagStringify from '../../src/hooks/silent/virtualResponse/vtagStringify';
import { GlobalSQSuccessEvent } from '../../typings';
import { mockRequestAdapter } from '../mockData';
import { untilCbCalled } from '../utils';

beforeEach(() => (globalVirtualResponseLock.v = 0));
describe('boot silent queue', () => {
  test('replace vtag to real data', () => {
    const virtualResponse = createVirtualResponse({ id: 'loading...' });
    const vid = virtualResponse.id;
    const text = virtualResponse.text;
    globalVirtualResponseLock.v = 2;

    const methodInstance = new Method(
      'DELETE',
      createAlova({
        baseURL: 'http://xxx',
        statesHook: VueHook,
        requestAdapter: mockRequestAdapter
      }),
      `/detail/${vtagStringify(vid)}`,
      {
        transformData: (data: any) => data
      },
      { whole: virtualResponse, text }
    );
    const virtualTagReplacedResponseMap = {
      [vtagStringify(virtualResponse)]: { id: 1 },
      [vtagStringify(vid)]: 1,
      [vtagStringify(text)]: undefined
    };

    deepReplaceVTag(methodInstance, virtualTagReplacedResponseMap);
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
    deepReplaceVTag(methodInstance2, virtualTagReplacedResponseMap);
    expect(methodInstance2.url).toBe('/detail');
    expect(methodInstance2.requestBody).toEqual({
      whole: { id: 123 },
      text: ''
    });
  });

  test('execute single queue with 2 method which connected by vtag', async () => {
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter
    });

    const methodResolveFn = jest.fn();
    const methodRejectFn = jest.fn();
    const methodFallbackFn = jest.fn();

    const bootMockFn = jest.fn();
    const successMockFn = jest.fn();
    const completeMockFn = jest.fn();
    const pms = new Promise(resolve => {
      const virtualResponse = createVirtualResponse({ id: 'loading...' });
      const vid = virtualResponse.id;
      globalVirtualResponseLock.v = 2;

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
        'silent',
        'abcdef',
        undefined,
        2,
        undefined,
        [
          () => {
            methodFallbackFn();
          }
        ],
        value => {
          methodResolveFn();
          expect(value).toStrictEqual({ id: 1 });
        },
        () => {
          methodRejectFn();
        }
      );
      silentMethodInstance.virtualResponse = virtualResponse;

      // 模拟数据删除
      const methodInstance2 = new Method(
        'DELETE',
        alovaInst,
        `/detail/${vtagStringify(vid)}`,
        {
          transformData: (data: any) => data
        },
        { id: vid }
      );
      const silentMethodInstance2 = new SilentMethod(
        methodInstance2,
        'silent',
        'abcdef',
        undefined,
        2,
        undefined,
        [
          () => {
            methodFallbackFn();
          }
        ],
        value => {
          methodResolveFn();
          expect(value).toStrictEqual({
            params: {
              id: '1'
            },
            data: { id: 1 }
          });
          resolve(0);
        },
        () => {
          methodRejectFn();
        },
        undefined,
        undefined,
        [vid]
      );
      // 锁定前构造，否则virtualResponse.id将拿到原始值
      const vtagResponsePayload = {
        [vtagStringify(virtualResponse)]: { id: 1 },
        [vtagStringify(vid)]: 1
      };

      pushNewSilentMethod2Queue(silentMethodInstance, false);
      pushNewSilentMethod2Queue(silentMethodInstance2, false);
      onSilentSubmitBoot(() => {
        bootMockFn();
      });
      onSilentSubmitBoot(() => {
        bootMockFn();
      });

      let successCallIndex = 0;
      onSilentSubmitSuccess(event => {
        successMockFn();
        // 验证event内的数据
        expect(event.behavior).toBe('silent');
        if (successCallIndex === 0) {
          expect(event.data).toStrictEqual({ id: 1 });
          expect(event.method).toBe(methodInstance);
          expect(event.silentMethod).toBe(silentMethodInstance);
          expect(event.vtagResponse).toStrictEqual(vtagResponsePayload);
        } else if (successCallIndex === 1) {
          expect(event.data).toStrictEqual({
            params: {
              id: '1'
            },
            data: { id: 1 }
          });
          expect(event.method).toBe(methodInstance2);
          expect(event.silentMethod).toBe(silentMethodInstance2);
          expect(event.vtagResponse).toStrictEqual({});
        }
        successCallIndex++;
      });

      let completeCallIndex = 0;
      onSilentSubmitComplete(e => {
        completeMockFn();
        // 验证event内的数据
        const event = e as GlobalSQSuccessEvent;
        expect(event.behavior).toBe('silent');
        if (completeCallIndex === 0) {
          expect(event.data).toStrictEqual({ id: 1 });
          expect(event.method).toBe(methodInstance);
          expect(event.silentMethod).toBe(silentMethodInstance);
          expect(event.vtagResponse).toStrictEqual(vtagResponsePayload);
        } else if (completeCallIndex === 1) {
          expect(event.data).toStrictEqual({
            params: {
              id: '1'
            },
            data: { id: 1 }
          });
          expect(event.method).toBe(methodInstance2);
          expect(event.silentMethod).toBe(silentMethodInstance2);
          expect(event.vtagResponse).toStrictEqual({});
        }
        completeCallIndex++;
      });

      // 启动silentFactory
      bootSilentFactory({
        alova: alovaInst,
        delay: 0
      });
    });

    await pms;
    await untilCbCalled(setTimeout, 200);

    // 局部调用情况
    expect(methodResolveFn).toBeCalledTimes(2);
    expect(methodRejectFn).toBeCalledTimes(0);
    expect(methodFallbackFn).toBeCalledTimes(0);

    // 全局回调调用情况
    expect(bootMockFn).toBeCalledTimes(2);
    expect(successMockFn).toBeCalledTimes(2); // 两个silentMethod分别触发一次
    expect(completeMockFn).toBeCalledTimes(2); // 两个silentMethod分别触发一次
  });

  test('execute queue that the first is undefined response', async () => {
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter
    });
    const pms = new Promise(resolve => {
      const virtualResponse = createVirtualResponse(undefined);
      const methodInstance = new Method('POST', alovaInst, '/detail', {
        transformData: () => undefined
      });
      const silentMethodInstance = new SilentMethod(methodInstance, 'silent', 'abcdef', /.*/, 2, {
        delay: 2000,
        multiplier: 1.5
      });
      silentMethodInstance.virtualResponse = virtualResponse;
      const vid = virtualResponse.id;
      const other = virtualResponse.other[0];
      globalVirtualResponseLock.v = 2;

      const methodInstance2 = new Method('DELETE', alovaInst, `/detail/${vid}`, undefined, {
        id: vid,
        other
      });
      const silentMethodInstance2 = new SilentMethod(
        methodInstance2,
        'silent',
        'abcdef',
        /.*/,
        2,
        {
          delay: 2000,
          multiplier: 1.5
        },
        undefined,
        value => {
          expect(value).toStrictEqual({
            params: {
              id: 'undefined'
            },
            data: {
              id: undefined,
              other: undefined
            }
          });
          resolve(0);
        },
        undefined,
        undefined,
        undefined,
        [vid]
      );
      pushNewSilentMethod2Queue(silentMethodInstance, false);
      pushNewSilentMethod2Queue(silentMethodInstance2, false);

      // 启动silentFactory
      bootSilentFactory({
        alova: alovaInst,
        delay: 0
      });
    });
    await pms;
    await untilCbCalled(setTimeout, 200);
  });

  test('execute queue that the first is primirive response', async () => {
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter
    });
    const pms = new Promise(resolve => {
      const virtualResponse = createVirtualResponse(undefined);
      const methodInstance = new Method('POST', alovaInst, '/detail', {
        transformData: () => true
      });
      const silentMethodInstance = new SilentMethod(methodInstance, 'silent', 'abcdef', /.*/, 2, {
        delay: 2000,
        multiplier: 1.5
      });
      silentMethodInstance.virtualResponse = virtualResponse;
      const methodInstance2 = new Method('DELETE', alovaInst, `/detail/${vtagStringify(virtualResponse)}`, undefined, {
        whole: virtualResponse
      });
      const silentMethodInstance2 = new SilentMethod(
        methodInstance2,
        'silent',
        'abcdef',
        /.*/,
        2,
        {
          delay: 2000,
          multiplier: 1.5
        },
        undefined,
        value => {
          resolve(0);
          expect(value).toStrictEqual({
            params: {
              id: 'true'
            },
            data: {
              whole: true
            }
          });
        },
        undefined,
        undefined,
        undefined,
        [virtualResponse]
      );
      globalVirtualResponseLock.v = 2;
      pushNewSilentMethod2Queue(silentMethodInstance, false);
      pushNewSilentMethod2Queue(silentMethodInstance2, false);

      // 启动silentFactory
      bootSilentFactory({
        alova: alovaInst,
        delay: 0
      });
    });
    await pms;
    await untilCbCalled(setTimeout, 200);
  });
});
