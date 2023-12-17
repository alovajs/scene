import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import { createAlova } from 'alova';
import ReactHook from 'alova/react';
import React, { ReactElement } from 'react';
import { mockRequestAdapter } from '~/test/mockData';
import { untilCbCalled } from '~/test/utils';
import { useAutoRequest } from '..';

const alovaInst = createAlova({
  baseURL: 'http://localhost:8080',
  statesHook: ReactHook,
  localCache: null,
  requestAdapter: mockRequestAdapter,
  cacheLogger: false
});
const mockGlobalEventEmit = (type: string) => {
  const event = new window.Event(type);
  act(() => {
    window.dispatchEvent(event);
  });
};

const originalOnNetwork = useAutoRequest.onNetwork;
const originalOnVisibility = useAutoRequest.onVisibility;
const originalOnFocus = useAutoRequest.onFocus;
const originalOnPolling = useAutoRequest.onPolling;
beforeEach(() => {
  useAutoRequest.onNetwork = originalOnNetwork;
  useAutoRequest.onVisibility = originalOnVisibility;
  useAutoRequest.onFocus = originalOnFocus;
  useAutoRequest.onPolling = originalOnPolling;
});
describe('react => useAutoRequest', () => {
  test('should request when window event is emitted', async () => {
    const networkFn = jest.fn();
    const visibilityFn = jest.fn();
    const focusFn = jest.fn();
    const pollingFn = jest.fn();
    useAutoRequest.onNetwork = (...args: any) => {
      networkFn();
      return (originalOnNetwork as any)(...args);
    };
    useAutoRequest.onVisibility = (...args: any[]) => {
      visibilityFn();
      return (originalOnVisibility as any)(...args);
    };
    useAutoRequest.onFocus = (...args: any[]) => {
      focusFn();
      return (originalOnFocus as any)(...args);
    };
    useAutoRequest.onPolling = (...args: any[]) => {
      pollingFn();
      return (originalOnPolling as any)(...args);
    };

    let tag = 'init';
    const Page = () => {
      const { data } = useAutoRequest(
        () => {
          return alovaInst.Get('/return-query', {
            params: { tag },
            transformData: ({ query }: any) => query
          });
        },
        {
          throttle: 0
        }
      );
      return <span role="data">{JSON.stringify(data)}</span>;
    };
    render((<Page />) as ReactElement<any, any>);
    await waitFor(() => {
      expect(screen.getByRole('data')).toHaveTextContent(JSON.stringify({ tag }));
      expect(networkFn).toHaveBeenCalledTimes(1);
      expect(focusFn).toHaveBeenCalledTimes(1);
      expect(visibilityFn).not.toHaveBeenCalled();
      expect(pollingFn).not.toHaveBeenCalled();
    });

    tag = 'online';
    mockGlobalEventEmit('online');
    await waitFor(() => {
      expect(screen.getByRole('data')).toHaveTextContent(JSON.stringify({ tag }));
    });

    tag = 'focus';
    mockGlobalEventEmit('focus');
    await waitFor(() => {
      expect(screen.getByRole('data')).toHaveTextContent(JSON.stringify({ tag }));
    });

    // visiblitychange默认不开启
    tag = 'visibilitychange';
    mockGlobalEventEmit('visibilitychange');
    await waitFor(() => {
      expect(screen.getByRole('data')).toHaveTextContent(JSON.stringify({ tag: 'focus' }));
    });
  });

  test('should polling request when set pollingTime', async () => {
    const networkFn = jest.fn();
    const visibilityFn = jest.fn();
    const focusFn = jest.fn();
    const pollingFn = jest.fn();
    useAutoRequest.onNetwork = (...args: any) => {
      networkFn();
      return (originalOnNetwork as any)(...args);
    };
    useAutoRequest.onVisibility = (...args: any[]) => {
      visibilityFn();
      return (originalOnVisibility as any)(...args);
    };
    useAutoRequest.onFocus = (...args: any[]) => {
      focusFn();
      return (originalOnFocus as any)(...args);
    };
    useAutoRequest.onPolling = (...args: any[]) => {
      pollingFn();
      return (originalOnPolling as any)(...args);
    };
    let tag = 'init';
    const Page = () => {
      const { data } = useAutoRequest(
        () => {
          return alovaInst.Get('/return-query', {
            params: { tag },
            transformData: ({ query }: any) => query
          });
        },
        {
          enableNetwork: false,
          enableFocus: false,
          enableVisibility: false,
          pollingTime: 100
        }
      );
      return <span role="data">{JSON.stringify(data)}</span>;
    };
    render((<Page />) as ReactElement<any, any>);
    await waitFor(() => {
      expect(screen.getByRole('data')).toHaveTextContent(JSON.stringify({ tag }));
      expect(networkFn).not.toHaveBeenCalled();
      expect(focusFn).not.toHaveBeenCalled();
      expect(visibilityFn).not.toHaveBeenCalled();
      expect(pollingFn).toHaveBeenCalledTimes(1);
    });

    tag = 'polling 1';
    await untilCbCalled(setTimeout, 100);
    await waitFor(() => {
      expect(screen.getByRole('data')).toHaveTextContent(JSON.stringify({ tag }));
    });

    tag = 'polling 2';
    await untilCbCalled(setTimeout, 100);
    await waitFor(() => {
      expect(screen.getByRole('data')).toHaveTextContent(JSON.stringify({ tag }));
    });
  });

  test('should unbind event when component is destroyed', async () => {
    const networkOffFn = jest.fn();
    const visibilityOffFn = jest.fn();
    const focusOffFn = jest.fn();
    const pollingOffFn = jest.fn();
    useAutoRequest.onNetwork = (...args: any) => {
      const off = (originalOnNetwork as any)(...args);
      return () => {
        networkOffFn();
        off();
      };
    };
    useAutoRequest.onVisibility = (...args: any[]) => {
      const off = (originalOnVisibility as any)(...args);
      return () => {
        visibilityOffFn();
        off();
      };
    };
    useAutoRequest.onFocus = (...args: any[]) => {
      const off = (originalOnFocus as any)(...args);
      return () => {
        focusOffFn();
        off();
      };
    };
    useAutoRequest.onPolling = (...args: any[]) => {
      const off = (originalOnPolling as any)(...args);
      return () => {
        pollingOffFn();
        off();
      };
    };

    let tag = 'init';
    const Page = () => {
      const { data } = useAutoRequest(
        () => {
          return alovaInst.Get('/return-query', {
            params: { tag },
            transformData: ({ query }: any) => query
          });
        },
        {
          enableVisibility: true,
          pollingTime: 100
        }
      );
      return <span role="data">{JSON.stringify(data)}</span>;
    };
    const { unmount } = render((<Page />) as ReactElement<any, any>);
    await waitFor(() => {
      expect(screen.getByRole('data')).toHaveTextContent(JSON.stringify({ tag }));
    });

    unmount();
    await waitFor(() => {
      expect(networkOffFn).toHaveBeenCalledTimes(1);
      expect(focusOffFn).toHaveBeenCalledTimes(1);
      expect(visibilityOffFn).toHaveBeenCalledTimes(1);
      expect(pollingOffFn).toHaveBeenCalledTimes(1);
    });
  });

  test('should request once when emit multiple events within one second defaultly', async () => {
    let tag = 'init';
    const Page = () => {
      const { data } = useAutoRequest(
        () => {
          return alovaInst.Get('/return-query', {
            params: { tag },
            transformData: ({ query }: any) => query
          });
        },
        {
          enableVisibility: true
        }
      );
      return <span role="data">{JSON.stringify(data)}</span>;
    };
    render((<Page />) as ReactElement<any, any>);
    await waitFor(() => {
      expect(screen.getByRole('data')).toHaveTextContent(JSON.stringify({ tag }));
    });

    // 默认1000ms内只有第一次会触发请求
    tag = 'online';
    mockGlobalEventEmit('online');
    await untilCbCalled(setTimeout, 100);
    tag = 'visibilitychange';
    mockGlobalEventEmit('visibilitychange');
    await untilCbCalled(setTimeout, 100);
    tag = 'focus';
    mockGlobalEventEmit('focus');
    await waitFor(() => {
      expect(screen.getByRole('data')).toHaveTextContent(JSON.stringify({ tag: 'online' }));
    });
  });
});
