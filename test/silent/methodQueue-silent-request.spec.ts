import { createAlova, Method } from 'alova';
import VueHook from 'alova/vue';
import { globalVirtualResponseLock } from '../../src/hooks/silent/globalVariables';
import {
  bootSilentFactory,
  offSilentSubmitComplete,
  offSilentSubmitError,
  offSilentSubmitSuccess,
  onSilentSubmitComplete,
  onSilentSubmitError,
  onSilentSubmitSuccess
} from '../../src/hooks/silent/silentFactory';
import { SilentMethod } from '../../src/hooks/silent/SilentMethod';
import { pushNewSilentMethod2Queue } from '../../src/hooks/silent/silentQueue';
import createVirtualResponse from '../../src/hooks/silent/virtualResponse/createVirtualResponse';
import { GlobalSQErrorEvent, GlobalSQSuccessEvent } from '../../typings';
import { mockRequestAdapter } from '../mockData';

describe('silent method request in queue with silent behavior', () => {
  test("it wouldn't retry when request is success", async () => {
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter
    });

    const fallbackMockFn = jest.fn();
    const retryMockFn = jest.fn();
    const methodInstance = new Method('POST', alovaInst, '/detail');
    const pms = new Promise<void>(resolve => {
      globalVirtualResponseLock.v = 0;
      const virtualResponse = createVirtualResponse({
        id: ''
      });
      const silentMethodInstance = new SilentMethod(
        methodInstance,
        'silent',
        undefined,
        /.*/,
        2,
        {
          delay: 50
        },
        [
          () => {
            fallbackMockFn();
          }
        ],
        value => resolve(value),
        undefined,
        undefined,
        undefined,
        [
          () => {
            retryMockFn();
          }
        ]
      );
      silentMethodInstance.virtualResponse = virtualResponse;
      globalVirtualResponseLock.v = 2;
      pushNewSilentMethod2Queue(silentMethodInstance, false);

      // 启动silentFactory
      bootSilentFactory({
        alova: alovaInst,
        delay: 0
      });
    });

    const completeMockFn = jest.fn();
    const completeHandler = (ev: any) => {
      completeMockFn();
      const event = ev as GlobalSQSuccessEvent;
      expect(event.behavior).toBe('silent');
      expect(event.data).toStrictEqual({ id: 1 });
      expect(event.method).toBe(methodInstance);
      expect(event.silentMethod).toBeInstanceOf(SilentMethod);
      expect(event.retryTimes).toBe(0);
      // 卸载全局事件避免污染其他用例
      offSilentSubmitComplete(completeHandler);
    };
    onSilentSubmitComplete(completeHandler);
    const successMockFn = jest.fn();
    const successHandler = (event: GlobalSQSuccessEvent) => {
      successMockFn();
      expect(event.behavior).toBe('silent');
      expect(event.data).toStrictEqual({ id: 1 });
      expect(event.method).toBe(methodInstance);
      expect(event.silentMethod).toBeInstanceOf(SilentMethod);
      expect(event.retryTimes).toBe(0);
      // 卸载全局事件避免污染其他用例
      offSilentSubmitSuccess(successHandler);
    };
    onSilentSubmitSuccess(successHandler);

    await pms;
    // 成功了，onFallback和onRetry都不会触发
    expect(fallbackMockFn).toBeCalledTimes(0);
    expect(retryMockFn).toBeCalledTimes(0);
    expect(completeMockFn).toBeCalledTimes(1);
    expect(successMockFn).toBeCalledTimes(1);
  });

  test('should emit success and not emit fallback after retry one time and success', async () => {
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter
    });

    const fallbackMockFn = jest.fn();
    const retryMockFn = jest.fn();
    const methodInstance = new Method('POST', alovaInst, '/detail-error', undefined, {
      id: 'a',
      failTimes: 1
    });
    const pms = new Promise(resolve => {
      globalVirtualResponseLock.v = 0;
      const virtualResponse = createVirtualResponse({
        id: ''
      });
      const silentMethodInstance = new SilentMethod(
        methodInstance,
        'silent',
        undefined,
        /^no permission$/,
        2,
        {
          delay: 50
        },
        [
          () => {
            fallbackMockFn();
          }
        ],
        value => resolve(value),
        undefined,
        undefined,
        undefined,
        [
          () => {
            retryMockFn();
          }
        ]
      );
      silentMethodInstance.virtualResponse = virtualResponse;
      globalVirtualResponseLock.v = 2;
      pushNewSilentMethod2Queue(silentMethodInstance, false, 't1'); // 多个用例需要分别放到不同队列，否则会造成冲突

      // 启动silentFactory
      bootSilentFactory({
        alova: alovaInst,
        delay: 0
      });
    });

    const completeMockFn = jest.fn();
    onSilentSubmitComplete(() => {
      completeMockFn();
    });
    const successMockFn = jest.fn();
    onSilentSubmitSuccess(() => {
      successMockFn();
    });

    await pms;
    // 成功了，onFallback和onRetry都不会触发
    expect(fallbackMockFn).toBeCalledTimes(0);
    expect(retryMockFn).toBeCalledTimes(1);
    expect(completeMockFn).toBeCalledTimes(1);
    expect(successMockFn).toBeCalledTimes(1);
  });

  test('should emit fallback event when retry times are reached', async () => {
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter
    });

    const fallbackMockFn = jest.fn();
    const retryMockFn = jest.fn();
    const executeOrder = [] as string[]; // 用于记录执行顺序，后续验证
    const methodInstance = new Method('POST', alovaInst, '/detail-error', {}, { id: 'b' });
    const pms = new Promise<void>(resolve => {
      globalVirtualResponseLock.v = 0;
      const virtualResponse = createVirtualResponse({
        id: ''
      });
      const silentMethodInstance = new SilentMethod(
        methodInstance,
        'silent',
        undefined,
        {
          name: /^403$/
        },
        2,
        {
          delay: 50
        },
        [
          () => {
            fallbackMockFn();
            executeOrder.push('fallback');
            console.log('fallback...');
            resolve();
          }
        ],
        undefined,
        undefined,
        undefined,
        undefined,
        [
          event => {
            executeOrder.push(`retried_${event.retryTimes}`);
            retryMockFn();

            expect(event.behavior).toBe('silent');
            expect(event.method).toBe(methodInstance);
            expect(event.silentMethod).toBe(silentMethodInstance);
            expect(event.retryTimes).toBeLessThanOrEqual(2);
            expect(event.retryDelay).toBe(50);
          }
        ]
      );
      silentMethodInstance.virtualResponse = virtualResponse;
      globalVirtualResponseLock.v = 2;
      pushNewSilentMethod2Queue(silentMethodInstance, false, 't2');

      // 启动silentFactory
      bootSilentFactory({
        alova: alovaInst,
        delay: 0
      });
    });

    const completeMockFn = jest.fn();
    const completeHandler = (ev: any) => {
      completeMockFn();
      const event = ev as GlobalSQErrorEvent;
      expect(event.behavior).toBe('silent');
      expect(event.error.message).toBe('no permission');
      expect(event.method).toBe(methodInstance);
      expect(event.silentMethod).toBeInstanceOf(SilentMethod);
      expect(event.retryTimes).toBe(2);
      // 卸载全局事件避免污染其他用例
      offSilentSubmitComplete(completeHandler);
    };
    onSilentSubmitComplete(completeHandler);
    const errorMockFn = jest.fn();
    const errorHandler = (event: GlobalSQErrorEvent) => {
      errorMockFn();
      expect(event.behavior).toBe('silent');
      expect(event.error.message).toBe('no permission');
      expect(event.method).toBe(methodInstance);
      expect(event.silentMethod).toBeInstanceOf(SilentMethod);
      expect(event.retryTimes).toBe(2);
      // 卸载全局事件避免污染其他用例
      offSilentSubmitError(errorHandler);
    };
    onSilentSubmitError(errorHandler);

    await pms;
    // 有fallback回调时，不会触发nextRound
    expect(fallbackMockFn).toBeCalledTimes(1);
    expect(retryMockFn).toBeCalledTimes(2);
    expect(executeOrder).toEqual(['retried_1', 'retried_2', 'fallback']);
  });

  test('should emit global error event and never retry when retryError not match error message', async () => {
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter
    });

    const fallbackMockFn = jest.fn();
    const retryMockFn = jest.fn();
    const methodInstance = new Method('POST', alovaInst, '/detail-error', {}, { id: 'c' });
    const pms = new Promise<void>(resolve => {
      globalVirtualResponseLock.v = 0;
      const virtualResponse = createVirtualResponse({
        id: ''
      });
      const silentMethodInstance = new SilentMethod(
        methodInstance,
        'silent',
        undefined,
        /api not found/,
        4,
        { delay: 50 },
        [
          () => {
            fallbackMockFn();
            resolve();
          }
        ]
      );
      silentMethodInstance.virtualResponse = virtualResponse;
      globalVirtualResponseLock.v = 2;
      pushNewSilentMethod2Queue(silentMethodInstance, false, 't3');

      // 启动silentFactory
      bootSilentFactory({
        alova: alovaInst,
        delay: 0
      });
    });

    await pms;
    expect(fallbackMockFn).toBeCalledTimes(1);
    // 失败错误未匹配retryError，因此不会重试，直接调用fallback
    expect(retryMockFn).toBeCalledTimes(0);
  });

  test('should catch the error that throws in responsed interception', async () => {
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter,
      responsed: () => {
        throw new Error('custom error');
      }
    });

    const fallbackMockFn = jest.fn();
    const retryMockFn = jest.fn();
    const methodInstance = new Method('POST', alovaInst, '/detail');
    const pms = new Promise<void>(resolve => {
      globalVirtualResponseLock.v = 0;
      const virtualResponse = createVirtualResponse({
        id: ''
      });
      const silentMethodInstance = new SilentMethod(
        methodInstance,
        'silent',
        undefined,
        /^custom error$/,
        2,
        {
          delay: 50
        },
        [
          () => {
            fallbackMockFn();
            resolve();
          }
        ],
        undefined,
        undefined,
        undefined,
        undefined,
        [
          () => {
            retryMockFn();
          }
        ]
      );
      silentMethodInstance.virtualResponse = virtualResponse;
      globalVirtualResponseLock.v = 2;
      pushNewSilentMethod2Queue(silentMethodInstance, false, 't4'); // 多个用例需要分别放到不同队列，否则会造成冲突

      // 启动silentFactory
      bootSilentFactory({
        alova: alovaInst,
        delay: 0
      });
    });

    await pms;
    expect(fallbackMockFn).toBeCalledTimes(1);
    expect(retryMockFn).toBeCalledTimes(2);
  });

  test('should multiple times delay request with multiplier set', async () => {
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter
    });

    const fallbackMockFn = jest.fn();
    const retryMockFn = jest.fn();
    const methodInstance = new Method('POST', alovaInst, '/detail-error');
    const pms = new Promise<void>(resolve => {
      globalVirtualResponseLock.v = 0;
      const virtualResponse = createVirtualResponse({
        id: ''
      });
      const silentMethodInstance = new SilentMethod(
        methodInstance,
        'silent',
        undefined,
        /.*/,
        2,
        {
          delay: 50,
          multiplier: 2
        },
        [
          () => {
            fallbackMockFn();
            resolve();
          }
        ],
        undefined,
        undefined,
        undefined,
        undefined,
        [
          event => {
            retryMockFn();
            expect(event.retryDelay).toBe(50 * Math.pow(2, event.retryTimes - 1));
          }
        ]
      );
      silentMethodInstance.virtualResponse = virtualResponse;
      globalVirtualResponseLock.v = 2;
      pushNewSilentMethod2Queue(silentMethodInstance, false, 't5');
      bootSilentFactory({
        alova: alovaInst,
        delay: 0
      });
    });

    await pms;
    expect(fallbackMockFn).toBeCalledTimes(1);
    expect(retryMockFn).toBeCalledTimes(2);
  });

  test('should add 0 to endQuiver random delay when only set endQuiver', async () => {
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter
    });

    const fallbackMockFn = jest.fn();
    const retryMockFn = jest.fn();
    const methodInstance = new Method(
      'POST',
      alovaInst,
      '/detail-error',
      {},
      {
        id: 'f'
      }
    );
    const pms = new Promise<void>(resolve => {
      const silentMethodInstance = new SilentMethod(
        methodInstance,
        'silent',
        undefined,
        /.*/,
        2,
        {
          delay: 50,
          endQuiver: 0.6
        },
        [
          () => {
            fallbackMockFn();
            resolve();
          }
        ],
        undefined,
        undefined,
        undefined,
        undefined,
        [
          event => {
            retryMockFn();
            expect(event.retryDelay).toBeGreaterThanOrEqual(50);
            expect(event.retryDelay).toBeLessThanOrEqual(50 + 50 * (silentMethodInstance.backoff?.endQuiver || 0));
          }
        ]
      );
      pushNewSilentMethod2Queue(silentMethodInstance, false, 't6');
      bootSilentFactory({
        alova: alovaInst,
        delay: 0
      });
    });

    await pms;
  });

  test('should add startQuiver to 1 random delay when only set startQuiver', async () => {
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter
    });

    const fallbackMockFn = jest.fn();
    const retryMockFn = jest.fn();
    const methodInstance = new Method('POST', alovaInst, '/detail-error', {}, { id: 'g' });
    const pms = new Promise<void>(resolve => {
      const silentMethodInstance = new SilentMethod(
        methodInstance,
        'silent',
        undefined,
        /.*/,
        2,
        {
          delay: 50,
          startQuiver: 0.4
        },
        [
          () => {
            fallbackMockFn();
            resolve();
          }
        ],
        undefined,
        undefined,
        undefined,
        undefined,
        [
          event => {
            retryMockFn();
            expect(event.retryDelay).toBeGreaterThanOrEqual(50 + (silentMethodInstance.backoff?.startQuiver || 0));
            expect(event.retryDelay).toBeLessThanOrEqual(50 + 50 * 1);
          }
        ]
      );
      pushNewSilentMethod2Queue(silentMethodInstance, false, 't7');
      bootSilentFactory({
        alova: alovaInst,
        delay: 0
      });
    });
    await pms;
  });

  test('should add startQuiver to endQuiver random delay when set startQuiver and endQuiver at the same time', async () => {
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter
    });

    const methodInstance = new Method('POST', alovaInst, '/detail-error', {}, { id: 'hh' });
    const pms = new Promise<void>(resolve => {
      const silentMethodInstance = new SilentMethod(
        methodInstance,
        'silent',
        undefined,
        /.*/,
        2,
        {
          delay: 50,
          startQuiver: 0.4,
          endQuiver: 0.6
        },
        [
          () => {
            resolve();
          }
        ],
        undefined,
        undefined,
        undefined,
        undefined,
        [
          event => {
            expect(event.retryDelay).toBeGreaterThanOrEqual(50 + (silentMethodInstance.backoff?.startQuiver || 0));
            expect(event.retryDelay).toBeLessThanOrEqual(50 + 50 * (silentMethodInstance.backoff?.endQuiver || 0));
          }
        ]
      );
      pushNewSilentMethod2Queue(silentMethodInstance, false, 't8');
      bootSilentFactory({
        alova: alovaInst,
        delay: 0
      });
    });
    await pms;
  });
});
