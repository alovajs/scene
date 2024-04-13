import { undefinedValue } from '@/helper/variables';
import '@testing-library/jest-dom';
import { Alova, createAlova } from 'alova';
import GlobalFetch, { FetchRequestInit } from 'alova/GlobalFetch';
import VueHook from 'alova/vue';
import ES from 'eventsource';
import { AddressInfo } from 'net';
import { Ref } from 'vue';
import { IntervalEventName, IntervalMessage, TriggerEventName, server, send as serverSend } from '~/test/sseServer';
import { untilCbCalled } from '~/test/utils';
import { AnyFn, SSEHookReadyState } from '~/typings/general';
import { useSSE } from '..';
import { AlovaSSEMessageEvent } from '../typings/general';

Object.defineProperty(global, 'EventSource', { value: ES, writable: false });

let alovaInst: Alova<Ref<unknown>, Ref<unknown>, FetchRequestInit, any, Record<string, string | number>>;

afterEach(() => {
  server.close();
});

type AnyMessageType<T = any> = AlovaSSEMessageEvent<T, any, any, any, any, any, any, any>;

/**
 * 准备 Alova 实例环境，并且开始 SSE 服务器的监听
 */
const prepareAlova = async () => {
  await server.listen();
  const { port } = server.address() as AddressInfo;
  alovaInst = createAlova({
    baseURL: `http://127.0.0.1:${port}`,
    statesHook: VueHook,
    requestAdapter: GlobalFetch(),
    cacheLogger: false
  }) as any;
};

describe('vue => useSSE', () => {
  // ! 无初始数据，不立即发送请求
  test('should default NOT request immediately', async () => {
    await prepareAlova();
    const poster = (data: any) => alovaInst.Get(`/${IntervalEventName}`, data);
    const { on, onOpen, data, readyState, send } = useSSE(poster, { immediate: false });
    const cb = jest.fn();
    const openCb = jest.fn();
    on(IntervalEventName, cb);
    onOpen(openCb);
    const onIntervalCb = (cb: AnyFn) => on(IntervalEventName, cb);

    expect(readyState.value).toStrictEqual(SSEHookReadyState.CLOSED);
    expect(data.value).toBeUndefined();

    // 如果 immediate 有问题，1000ms 内就会得到至少一个 interval 消息
    await untilCbCalled(setTimeout, 1000);

    expect(readyState.value).toStrictEqual(SSEHookReadyState.CLOSED);
    expect(data.value).toBeUndefined();

    // 调用 send 方法前不应该收到消息
    expect(cb).not.toHaveBeenCalled();
    expect(openCb).not.toHaveBeenCalled();

    await send();
    expect(openCb).toHaveBeenCalled();

    const { data: recvData } = (await untilCbCalled(onIntervalCb)) as AnyMessageType<string>;

    expect(readyState.value).toStrictEqual(SSEHookReadyState.OPEN);
    expect(cb).toHaveBeenCalled();

    expect(recvData).toEqual(IntervalMessage);
    expect(data.value).toStrictEqual(IntervalMessage);
  }, 3000);

  // ! 有初始数据，不立即发送请求
  test('should get the initial data and NOT send request immediately', async () => {
    await prepareAlova();
    const poster = (data: any) => alovaInst.Get(`/${TriggerEventName}`, data);
    const initialData = {
      id: 9527,
      name: 'Tom',
      age: 18
    };
    const { onMessage, onOpen, data, readyState, send } = useSSE(poster, { immediate: false, initialData });

    const testDataA = 'test-data-1';
    const testDataB = 'test-data-2';

    const cb = jest.fn();
    const openCb = jest.fn();
    onMessage(cb);
    onOpen(openCb);

    expect(readyState.value).toStrictEqual(SSEHookReadyState.CLOSED);
    expect(data.value).toStrictEqual(initialData);

    // 调用 send 方法前不应该收到消息
    expect(cb).not.toHaveBeenCalled();
    expect(openCb).not.toHaveBeenCalled();

    // 服务器发送信息
    await serverSend(testDataA);
    await untilCbCalled(setTimeout, 300);

    // 此时还没有调用 send，不应该收到信息
    expect(readyState.value).toStrictEqual(SSEHookReadyState.CLOSED);
    expect(data.value).toStrictEqual(initialData);

    expect(openCb).not.toHaveBeenCalled();
    expect(cb).not.toHaveBeenCalled();

    // 调用 send 连接服务器，并使服务器发送信息
    await send();
    serverSend(testDataB);

    const { data: recvData } = (await untilCbCalled(onMessage)) as AnyMessageType<string>;

    expect(readyState.value).toStrictEqual(SSEHookReadyState.OPEN);
    expect(cb).toHaveBeenCalled();

    expect(recvData).toEqual(testDataB);
    expect(data.value).toStrictEqual(testDataB);
  });

  // ! 有初始数据，立即发送请求
  test('should get the initial data and send request immediately', async () => {
    await prepareAlova();
    const poster = (data: any) => alovaInst.Get(`/${TriggerEventName}`, data);
    const initialData = {
      id: 9527,
      name: 'Tom',
      age: 18
    };
    const testDataA = 'test-data-1';

    const { onOpen, onMessage, data, readyState } = useSSE(poster, { initialData });
    let recv = undefinedValue;
    const cb = jest.fn((event: AnyMessageType) => {
      recv = event.data;
    });
    expect(readyState.value).toStrictEqual(SSEHookReadyState.CLOSED);

    onMessage(cb);
    expect(data.value).toStrictEqual(initialData);

    // 等待 SSE 连接
    await untilCbCalled(onOpen);
    expect(readyState.value).toStrictEqual(SSEHookReadyState.OPEN);

    await serverSend(testDataA);
    await untilCbCalled(setTimeout, 300);

    expect(cb).toHaveBeenCalled();
    expect(recv).toEqual(testDataA);
    expect(data.value).toStrictEqual(testDataA);
  });

  // ! 测试关闭后重新连接
  test('should not trigger handler after close', async () => {
    await prepareAlova();
    const poster = (data: any) => alovaInst.Get(`/${TriggerEventName}`, data);
    const { onOpen, onMessage, data, readyState, send, close } = useSSE(poster);

    expect(readyState.value).toStrictEqual(SSEHookReadyState.CLOSED);
    await untilCbCalled(onOpen);
    expect(readyState.value).toStrictEqual(SSEHookReadyState.OPEN);

    let recv = undefinedValue;
    const cb = jest.fn((event: AnyMessageType) => {
      recv = event.data;
    });
    onMessage(cb);

    const testDataA = 'test-data-1';
    const testDataB = 'test-data-2';

    expect(data.value).toBeUndefined();

    // 测试发送数据 A
    await serverSend(testDataA);
    await untilCbCalled(setTimeout, 300);

    expect(cb).toHaveBeenCalledTimes(1);

    expect(readyState.value).toStrictEqual(SSEHookReadyState.OPEN);
    expect(recv).toStrictEqual(testDataA);
    expect(data.value).toStrictEqual(testDataA);

    // 关闭连接
    close();
    expect(readyState.value).toStrictEqual(SSEHookReadyState.CLOSED);

    // 测试发送数据 B
    await serverSend(testDataB);

    // 连接已经关闭，不应该触发事件，数据也应该不变
    expect(cb).toHaveBeenCalledTimes(1);
    expect(data.value).toStrictEqual(testDataA);
    expect(recv).toStrictEqual(testDataA);

    // 重新连接若干次。。。
    const openCb = jest.fn();
    onOpen(openCb);
    await send();
    await send();
    await send();
    await send();
    await send();

    expect(openCb).toHaveBeenCalledTimes(5);
    expect(readyState.value).toStrictEqual(SSEHookReadyState.OPEN);
    expect(data.value).toStrictEqual(testDataA);

    // 测试发送数据 B
    await serverSend(testDataB);
    await untilCbCalled(setTimeout, 300);

    // abortLast 为 true（默认）时，调用 send 会断开之前建立的连接
    expect(cb).toHaveBeenCalledTimes(2);
    expect(recv).toStrictEqual(testDataB);
    expect(data.value).toStrictEqual(testDataB);
  });
});
