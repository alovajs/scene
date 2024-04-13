import { undefinedValue } from '@/helper/variables';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Alova, createAlova } from 'alova';
import GlobalFetch, { FetchRequestInit } from 'alova/GlobalFetch';
import ReactHook from 'alova/react';
import ES from 'eventsource';
import { AddressInfo } from 'net';
import React, { ReactElement } from 'react';
import { IntervalEventName, IntervalMessage, TriggerEventName, server, send as serverSend } from '~/test/sseServer';
import { untilCbCalled } from '~/test/utils';
import { ReactState, useSSE } from '..';
import { AlovaSSEMessageEvent, SSEHookReadyState } from '../typings/general';

Object.defineProperty(global, 'EventSource', { value: ES, writable: false });

let alovaInst: Alova<ReactState<any>, unknown, FetchRequestInit, any, Record<string, string | number>>;

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
    statesHook: ReactHook,
    requestAdapter: GlobalFetch(),
    cacheLogger: false
  }) as any;
};

describe('react => useSSE', () => {
  // ! 无初始数据，不立即发送请求
  test('should default not request immediately', async () => {
    await prepareAlova();
    const poster = (data: any) => alovaInst.Get(`/${IntervalEventName}`, data);

    let recv = undefinedValue;
    const mockOpenFn = jest.fn();
    const mockOnFn = jest.fn((event: AnyMessageType) => {
      recv = event.data;
    });
    // const mockOpenFn = jest.fn();

    const Page = () => {
      const { on, onOpen, data, readyState, send } = useSSE(poster, { immediate: false });
      on(IntervalEventName, mockOnFn);
      onOpen(mockOpenFn);

      return (
        <div>
          <span role="status">
            {readyState === SSEHookReadyState.OPEN
              ? 'opened'
              : readyState === SSEHookReadyState.CLOSED
              ? 'closed'
              : 'connecting'}
          </span>
          <span role="data">{data}</span>
          <button
            role="btn"
            onClick={send}>
            send request
          </button>
        </div>
      );
    };

    render((<Page />) as ReactElement<any, any>);
    expect(screen.getByRole('status')).toHaveTextContent('closed');
    expect(screen.getByRole('data')).toBeEmptyDOMElement();

    // 如果 immediate 有问题，1000ms 内就会得到至少一个 interval 消息
    await untilCbCalled(setTimeout, 1000);

    expect(screen.getByRole('status')).toHaveTextContent('closed');
    expect(screen.getByRole('data')).toBeEmptyDOMElement();
    expect(mockOpenFn).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('btn'));

    await waitFor(
      () => {
        expect(screen.getByRole('status')).toHaveTextContent('opened');
        expect(screen.getByRole('data')).toHaveTextContent(IntervalMessage);
        expect(mockOnFn).toHaveBeenCalled();
        expect(recv).toStrictEqual(IntervalMessage);
      },
      { timeout: 4000 }
    );
  });

  // ! 有初始数据，不立即发送请求
  test('should get the initial data and NOT send request immediately', async () => {
    await prepareAlova();
    const poster = (data: any) => alovaInst.Get(`/${TriggerEventName}`, data);
    const initialData = 'initial-data';
    const testDataA = 'test-data-1';
    const testDataB = 'test-data-2';

    let recv = undefinedValue;
    const mockOpenFn = jest.fn();
    const mockOnFn = jest.fn((event: AnyMessageType) => {
      recv = event.data;
    });
    // const mockOpenFn = jest.fn();

    const Page = () => {
      const { onMessage, onOpen, data, readyState, send } = useSSE(poster, { immediate: false, initialData });
      onMessage(mockOnFn);
      onOpen(mockOpenFn);

      return (
        <div>
          <span role="status">
            {readyState === SSEHookReadyState.OPEN
              ? 'opened'
              : readyState === SSEHookReadyState.CLOSED
              ? 'closed'
              : 'connecting'}
          </span>
          <span role="data">{data}</span>
          <button
            role="btn"
            onClick={send}>
            send request
          </button>
        </div>
      );
    };

    render((<Page />) as ReactElement<any, any>);
    expect(screen.getByRole('status')).toHaveTextContent('closed');
    expect(screen.getByRole('data')).toHaveTextContent(initialData);

    // 如果 immediate 有问题，1000ms 内就会得到至少一个 interval 消息
    await untilCbCalled(setTimeout, 1000);

    expect(screen.getByRole('status')).toHaveTextContent('closed');
    expect(screen.getByRole('data')).toHaveTextContent(initialData);

    expect(mockOpenFn).not.toHaveBeenCalled();
    expect(mockOnFn).not.toHaveBeenCalled();

    // 服务器发送信息
    await serverSend(testDataA);
    await untilCbCalled(setTimeout, 300);

    // 此时还没有调用 send，不应该收到信息
    expect(screen.getByRole('status')).toHaveTextContent('closed');
    expect(screen.getByRole('data')).toHaveTextContent(initialData);

    expect(mockOnFn).not.toHaveBeenCalled();
    expect(mockOpenFn).not.toHaveBeenCalled();

    // 调用 send 连接服务器，并使服务器发送信息
    fireEvent.click(screen.getByRole('btn'));

    await untilCbCalled(setTimeout, 300);
    serverSend(testDataB);

    await waitFor(
      () => {
        expect(screen.getByRole('status')).toHaveTextContent('opened');
        expect(mockOnFn).toHaveBeenCalled();
        expect(screen.getByRole('data')).toHaveTextContent(testDataB);
        expect(recv).toStrictEqual(testDataB);
      },
      { timeout: 4000 }
    );
  });

  // ! 有初始数据，立即发送请求
  test('should get the initial data and send request immediately', async () => {
    await prepareAlova();
    const poster = (data: any) => alovaInst.Get(`/${TriggerEventName}`, data);
    const initialData = 'initial-data';
    const testDataA = 'test-data-1';

    let recv = undefinedValue;
    const mockOpenFn = jest.fn();
    const mockOnFn = jest.fn((event: AnyMessageType) => {
      recv = event.data;
    });

    const Page = () => {
      const { onMessage, onOpen, data, readyState } = useSSE(poster, { initialData });
      onMessage(mockOnFn);
      onOpen(mockOpenFn);

      return (
        <div>
          <span role="status">
            {readyState === SSEHookReadyState.OPEN
              ? 'opened'
              : readyState === SSEHookReadyState.CLOSED
              ? 'closed'
              : 'connecting'}
          </span>
          <span role="data">{data}</span>
        </div>
      );
    };

    render((<Page />) as ReactElement<any, any>);

    expect(screen.getByRole('status')).toHaveTextContent('closed');
    expect(screen.getByRole('data')).toHaveTextContent(initialData);

    await screen.findByText(/opened/);
    expect(mockOpenFn).toHaveBeenCalled();

    await serverSend(testDataA);

    await waitFor(
      () => {
        expect(mockOnFn).toHaveBeenCalled();
        expect(recv).toEqual(testDataA);
        expect(screen.getByRole('data')).toHaveTextContent(testDataA);
      },
      { timeout: 4000 }
    );
  });

  // ! 测试关闭后重新连接
  test('should not trigger handler after close', async () => {
    await prepareAlova();
    const poster = (data: any) => alovaInst.Get(`/${TriggerEventName}`, data);
    const testDataA = 'test-data-1';
    const testDataB = 'test-data-2';

    let recv = undefinedValue;
    const mockOpenFn = jest.fn();
    const mockOnMessageFn = jest.fn((event: AnyMessageType) => {
      recv = event.data;
    });

    const Page = () => {
      const { onMessage, onOpen, data, readyState, send, close } = useSSE(poster);
      onMessage(mockOnMessageFn);
      onOpen(mockOpenFn);

      return (
        <div>
          <span role="status">
            {readyState === SSEHookReadyState.OPEN
              ? 'opened'
              : readyState === SSEHookReadyState.CLOSED
              ? 'closed'
              : 'connecting'}
          </span>
          <span role="data">{data}</span>
          <button
            role="send"
            onClick={send}>
            send request
          </button>
          <button
            role="close"
            onClick={close}>
            close request
          </button>
        </div>
      );
    };

    render((<Page />) as ReactElement<any, any>);

    await screen.findByText(/opened/);

    expect(screen.getByRole('data')).toBeEmptyDOMElement();

    // 测试发送数据 A
    await serverSend(testDataA);
    await untilCbCalled(setTimeout, 300);

    expect(mockOnMessageFn).toHaveBeenCalledTimes(1);
    expect(recv).toStrictEqual(testDataA);
    expect(screen.getByRole('status')).toHaveTextContent('opened');
    expect(screen.getByRole('data')).toHaveTextContent(testDataA);

    // 关闭连接
    fireEvent.click(screen.getByRole('close'));
    await untilCbCalled(setTimeout, 100);
    expect(screen.getByRole('status')).toHaveTextContent('closed');

    // 测试发送数据 B
    await serverSend(testDataB);

    // 连接已经关闭，不应该触发事件，数据也应该不变
    expect(mockOnMessageFn).toHaveBeenCalledTimes(1);
    expect(recv).toStrictEqual(testDataA);
    expect(screen.getByRole('data')).toHaveTextContent(testDataA);

    // 重新连接若干次。。。
    fireEvent.click(screen.getByRole('send'));
    await untilCbCalled(setTimeout, 100);
    fireEvent.click(screen.getByRole('send'));
    await untilCbCalled(setTimeout, 100);
    fireEvent.click(screen.getByRole('send'));
    await untilCbCalled(setTimeout, 100);
    fireEvent.click(screen.getByRole('send'));
    await untilCbCalled(setTimeout, 100);
    fireEvent.click(screen.getByRole('send'));
    await untilCbCalled(setTimeout, 100);

    expect(mockOpenFn).toHaveBeenCalledTimes(6);
    expect(screen.getByRole('status')).toHaveTextContent('opened');
    expect(screen.getByRole('data')).toHaveTextContent(testDataA);

    // 测试发送数据 B
    await serverSend(testDataB);
    await untilCbCalled(setTimeout, 300);

    // abortLast 为 true（默认）时，调用 send 会断开之前建立的连接
    expect(mockOnMessageFn).toHaveBeenCalledTimes(2);
    expect(recv).toStrictEqual(testDataB);
    expect(screen.getByRole('data')).toHaveTextContent(testDataB);
  });
});
