import { createAlova } from 'alova';
import VueHook from 'alova/vue';
import { bootSilentFactory } from '../../src/hooks/silent/silentFactory';
import { SilentMethod } from '../../src/hooks/silent/SilentMethod';
import { silentQueueMap } from '../../src/hooks/silent/silentQueue';
import loadSilentQueueMapFromStorage from '../../src/hooks/silent/storage/loadSilentQueueMapFromStorage';
import useSQRequest from '../../src/hooks/silent/useSQRequest';
import { ScopedSQErrorEvent, ScopedSQSuccessEvent } from '../../typings';
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
jest.setTimeout(100000);
describe('useSQRequest', () => {
  test('request immediately with queue behavior', async () => {
    const Get = alovaInst.Get<{ total: number; list: number[] }>('/list');
    const { loading, data, error, downloading, uploading, onSuccess, onComplete, onBeforePushQueue, onPushedQueue } =
      useSQRequest(Get);

    const beforePushMockFn = jest.fn();
    onBeforePushQueue(event => {
      beforePushMockFn();
      expect(event.behavior).toBe('queue');
      expect(event.method).toBe(Get);
      expect(event.silentMethod).toBeInstanceOf(SilentMethod);
      expect(event.sendArgs).toStrictEqual([]);
      expect(Object.keys(silentQueueMap.default)).toHaveLength(0);
    });
    const pushedMockFn = jest.fn();
    onPushedQueue(event => {
      pushedMockFn();
      expect(event.behavior).toBe('queue');
      expect(event.method).toBe(Get);
      expect(event.silentMethod).toBeInstanceOf(SilentMethod);
      expect(event.sendArgs).toStrictEqual([]);
      expect(Object.keys(silentQueueMap.default)).toHaveLength(1);
      expect(silentQueueMap.default[0]).toBe(event.silentMethod);
    });

    expect(loading.value).toBeTruthy();
    expect(data.value).toBeUndefined();
    expect(downloading.value).toEqual({ total: 0, loaded: 0 });
    expect(uploading.value).toEqual({ total: 0, loaded: 0 });
    expect(error.value).toBeUndefined();
    // 通过decorateSuccess将成功回调参数改为事件对象了，因此强转为此对象
    const scopedSQSuccessEvent = (await untilCbCalled(onSuccess)) as unknown as ScopedSQSuccessEvent<
      any,
      any,
      any,
      any,
      any,
      any,
      any
    >;
    expect(loading.value).toBeFalsy();
    expect(data.value.total).toBe(300);
    expect(data.value.list).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(downloading.value).toEqual({ total: 0, loaded: 0 });
    expect(uploading.value).toEqual({ total: 0, loaded: 0 });
    expect(error.value).toBeUndefined();

    expect(scopedSQSuccessEvent.behavior).toBe('queue');
    expect(scopedSQSuccessEvent.method).toBe(Get);
    expect(scopedSQSuccessEvent.data.total).toBe(300);
    expect(scopedSQSuccessEvent.data.list).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(scopedSQSuccessEvent.sendArgs).toStrictEqual([]);
    expect(!!scopedSQSuccessEvent.silentMethod).toBeTruthy();

    onComplete(event => {
      expect(event.behavior).toBe('queue');
      expect(event.method).toBe(Get);
      expect(event.data.total).toBe(300);
      expect(event.data.list).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(event.sendArgs).toStrictEqual([]);
      expect(!!event.silentMethod).toBeTruthy();
    });

    expect(Object.keys(silentQueueMap.default)).toHaveLength(0);
  });

  test('use send function to request with queue behavior', async () => {
    const Get = (page: number, pageSize: number) =>
      alovaInst.Get<{ total: number; list: number[] }>('/list', {
        params: {
          page,
          pageSize
        }
      });
    const { loading, data, error, downloading, uploading, send, onSuccess, onBeforePushQueue, onPushedQueue } =
      useSQRequest((page, pageSize) => Get(page, pageSize), {
        immediate: false,
        queue: 'test_1'
      });

    const beforePushMockFn = jest.fn();
    onBeforePushQueue(event => {
      beforePushMockFn();
      expect(event.behavior).toBe('queue');
      expect(event.method.url).toBe('/list');
      expect(event.method.config.params).toStrictEqual({ page: 2, pageSize: 8 });
      expect(event.silentMethod).toBeInstanceOf(SilentMethod);
      expect(event.sendArgs).toStrictEqual([2, 8]);
    });
    const pushedMockFn = jest.fn();
    onPushedQueue(event => {
      pushedMockFn();
      expect(event.behavior).toBe('queue');
      expect(event.method.url).toBe('/list');
      expect(event.method.config.params).toStrictEqual({ page: 2, pageSize: 8 });
      expect(event.silentMethod).toBeInstanceOf(SilentMethod);
      expect(event.sendArgs).toStrictEqual([2, 8]);
    });

    expect(loading.value).toBeFalsy();
    send(2, 8); // 发送请求
    expect(loading.value).toBeTruthy();
    expect(data.value).toBeUndefined();
    expect(downloading.value).toEqual({ total: 0, loaded: 0 });
    expect(uploading.value).toEqual({ total: 0, loaded: 0 });
    expect(error.value).toBeUndefined();
    // 通过decorateSuccess将成功回调参数改为事件对象了，因此强转为此对象
    const scopedSQSuccessEvent = (await untilCbCalled(onSuccess)) as unknown as ScopedSQSuccessEvent<
      any,
      any,
      any,
      any,
      any,
      any,
      any
    >;
    expect(loading.value).toBeFalsy();
    expect(data.value.total).toBe(300);
    expect(data.value.list).toStrictEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(downloading.value).toEqual({ total: 0, loaded: 0 });
    expect(uploading.value).toEqual({ total: 0, loaded: 0 });
    expect(error.value).toBeUndefined();

    expect(scopedSQSuccessEvent.behavior).toBe('queue');
    expect(scopedSQSuccessEvent.data.total).toBe(300);
    expect(scopedSQSuccessEvent.data.list).toStrictEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(scopedSQSuccessEvent.sendArgs).toStrictEqual([2, 8]);
    expect(!!scopedSQSuccessEvent.silentMethod).toBeTruthy();
  });

  test('should emit onError immediately while request error and never retry', async () => {
    const Get = () => alovaInst.Get<never>('/list-error');
    const { loading, data, error, onError, onComplete } = useSQRequest(Get, {
      behavior: 'queue'
    });

    // 通过decorateSuccess将成功回调参数改为事件对象了，因此强转为此对象
    const scopedSQErrorEvent = (await untilCbCalled(onError)) as unknown as ScopedSQErrorEvent<
      any,
      any,
      any,
      any,
      any,
      any,
      any
    >;
    expect(loading.value).toBeFalsy();
    expect(data.value).toBeUndefined();
    expect(error.value?.message).toBe('server error');
    expect(scopedSQErrorEvent.behavior).toBe('queue');
    expect(scopedSQErrorEvent.error.message).toBe('server error');
    expect(scopedSQErrorEvent.sendArgs).toStrictEqual([]);
    expect(scopedSQErrorEvent.silentMethod).not.toBeUndefined();
    expect(silentQueueMap.default).toHaveLength(0); // 在队列中移除了

    onComplete(event => {
      expect(event.behavior).toBe('queue');
      expect(event.error.message).toBe('server error');
      expect(event.sendArgs).toStrictEqual([]);
      expect(event.silentMethod).not.toBeUndefined();
    });
  });

  test('should be the same as useRequest when behavior is static', async () => {
    const Get = () => alovaInst.Get<never>('/list');
    const { loading, data, error, onSuccess, onBeforePushQueue, onPushedQueue } = useSQRequest(Get, {
      behavior: () => 'static'
    });

    const pushMockFn = jest.fn();
    onBeforePushQueue(pushMockFn);
    onPushedQueue(pushMockFn);

    await untilCbCalled(setTimeout, 0);
    // static行为模式下不会进入队列，需异步检查
    expect(silentQueueMap.default).toBeUndefined();

    expect(loading.value).toBeTruthy();
    expect(data.value).toBeUndefined();
    // 通过decorateSuccess将成功回调参数改为事件对象了，因此强转为此对象
    const scopedSQSuccessEvent = (await untilCbCalled(onSuccess)) as unknown as ScopedSQSuccessEvent<
      any,
      any,
      any,
      any,
      any,
      any,
      any
    >;
    expect(pushMockFn).toBeCalledTimes(0);
    expect(loading.value).toBeFalsy();
    expect(data.value).toStrictEqual({
      total: 300,
      list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    });
    expect(error.value).toBeUndefined();
    expect(scopedSQSuccessEvent.behavior).toBe('static');
    expect(scopedSQSuccessEvent.data).toStrictEqual({
      total: 300,
      list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    });
    expect(scopedSQSuccessEvent.sendArgs).toStrictEqual([]);
    expect(scopedSQSuccessEvent.method).not.toBeUndefined();
    expect(scopedSQSuccessEvent.silentMethod).toBeUndefined();
  });

  test('should be persisted when has no fallbackHandlers in silent behavior', async () => {
    const Get = () => alovaInst.Get<never>('/list');
    useSQRequest(Get, {
      behavior: () => 'silent'
    });

    await untilCbCalled(setTimeout, 0);
    // static行为模式下不会进入队列，需异步检查
    expect(silentQueueMap.default).toHaveLength(1);
    let persistentSilentQueueMap = loadSilentQueueMapFromStorage();
    expect(persistentSilentQueueMap.default).toHaveLength(1);

    // 第二个请求
    const { onFallback } = useSQRequest(alovaInst.Get<any>('/list-error'), {
      behavior: () => 'silent',
      retryError: /.*/,
      maxRetryTimes: 2
    });
    onFallback(event => {
      expect(event.behavior).toBe('silent');
      expect(event.method).not.toBeUndefined();
      expect(event.silentMethod).toBeInstanceOf(SilentMethod);
      expect(event.sendArgs).toStrictEqual([]);
    });

    await untilCbCalled(setTimeout, 0);
    // static行为模式下不会进入队列，需异步检查
    expect(silentQueueMap.default.length).toBe(2);
    persistentSilentQueueMap = loadSilentQueueMapFromStorage();
    expect(persistentSilentQueueMap.default.length).toBe(1); // 绑定了onFallback时不会持久化
    await untilCbCalled(onFallback);
  });

  test('should be change behavior when param behavior set to a function that return different value', async () => {});

  test('should be intercpeted when has virtual tag in method instance', async () => {});

  test.only('the onSuccess should be emit immediately with virtualResponse, perhaps has default response', async () => {
    const Get = () => alovaInst.Get<never>('/list');
    useSQRequest(Get, {
      behavior: () => 'silent'
    });

    await untilCbCalled(setTimeout, 0);
    // static行为模式下不会进入队列，需异步检查
    expect(silentQueueMap.default).toHaveLength(1);
    let persistentSilentQueueMap = loadSilentQueueMapFromStorage();
    expect(persistentSilentQueueMap.default).toHaveLength(1);

    // 第二个请求
    const { onFallback, onError, onSuccess, onComplete } = useSQRequest(alovaInst.Get<any>('/list-error'), {
      behavior: () => 'silent',
      retryError: /.*/,
      maxRetryTimes: 2
    });
    onFallback(event => {
      expect(event.behavior).toBe('silent');
      expect(event.method).not.toBeUndefined();
      expect(event.silentMethod).toBeInstanceOf(SilentMethod);
      expect(event.sendArgs).toStrictEqual([]);
    });

    const successMockFn = jest.fn();
    const completeMockFn = jest.fn();
    // silent行为模式下，不论请求结果如何，这两个事件都将立即执行
    onSuccess(successMockFn);
    onComplete(completeMockFn);
    const errorMockFn = jest.fn();
    onError(errorMockFn); // silent模式下永远不会执行

    await untilCbCalled(setTimeout, 0);
    // static行为模式下不会进入队列，需异步检查
    expect(silentQueueMap.default.length).toBe(2);
    persistentSilentQueueMap = loadSilentQueueMapFromStorage();
    expect(persistentSilentQueueMap.default.length).toBe(1); // 绑定了onFallback时不会持久化
    // await untilCbCalled(onFallback);
    await untilCbCalled(setTimeout, 100000);
    expect(successMockFn).toBeCalledTimes(1);
    expect(completeMockFn).toBeCalledTimes(1);
    expect(errorMockFn).not.toBeCalled();
  });

  test('should be delay update states when call `updateStateEffect` in onSuccess handler', async () => {});

  test('should replace virtual tag to real value that method instance after requesting method instance', async () => {});
});
