import { Method, createAlova } from 'alova';
import VueHook from 'alova/vue';
import { createClientTokenAuthentication } from '../../packages/scene-vue';
import { mockRequestAdapter } from '../mockData';
import { generateContinuousNumbers } from '../utils';

interface ListResponse {
  total: number;
  list: number[];
}
describe('createClientTokenAuthentication', () => {
  test('should emit custom request and response interceptors', async () => {
    const { onAuthRequired, onResponseRefreshToken } = createClientTokenAuthentication<typeof mockRequestAdapter>({});
    const beforeRequestFn = jest.fn();
    const responseFn = jest.fn();
    const alovaInst = createAlova({
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter,
      localCache: null,
      beforeRequest: onAuthRequired(method => {
        expect(method).toBeInstanceOf(Method);
        beforeRequestFn();
      }),
      responded: onResponseRefreshToken((response, method) => {
        expect(method).toBeInstanceOf(Method);
        responseFn();
        return response;
      })
    });
    const { list } = await alovaInst.Get<ListResponse>('/list');
    expect(list).toStrictEqual(generateContinuousNumbers(9));
    expect(beforeRequestFn).toHaveBeenCalledTimes(1);
    expect(responseFn).toHaveBeenCalledTimes(1);

    const responseErrorFn = jest.fn();
    const completeFn = jest.fn();
    const alovaInst2 = createAlova({
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter,
      localCache: null,
      beforeRequest: onAuthRequired(method => {
        expect(method).toBeInstanceOf(Method);
        beforeRequestFn();
      }),
      responded: onResponseRefreshToken({
        onSuccess: (response, method) => {
          expect(response.total).toBe(300);
          expect(method).toBeInstanceOf(Method);
          responseFn();
          return response;
        },
        onError: (error, method) => {
          expect(error.message).toBe('server error');
          expect(method).toBeInstanceOf(Method);
          responseErrorFn();
          return error;
        },
        onComplete: method => {
          expect(method).toBeInstanceOf(Method);
          completeFn();
        }
      })
    });
    const { list: list2 } = await alovaInst2.Get<ListResponse>('/list');
    expect(list2).toStrictEqual(generateContinuousNumbers(9));
    expect(beforeRequestFn).toHaveBeenCalledTimes(2);
    expect(responseFn).toHaveBeenCalledTimes(2);
    expect(responseErrorFn).toHaveBeenCalledTimes(0);
    expect(completeFn).toHaveBeenCalledTimes(1);

    await alovaInst2.Get('list-error');
    expect(beforeRequestFn).toHaveBeenCalledTimes(3);
    expect(responseFn).toHaveBeenCalledTimes(2);
    expect(responseErrorFn).toHaveBeenCalledTimes(1);
    expect(completeFn).toHaveBeenCalledTimes(2);
  });

  test('should emit login interceptor when set authRole to `login`', async () => {
    const loginInterceptorFn = jest.fn();
    const { onAuthRequired, onResponseRefreshToken } = createClientTokenAuthentication<typeof mockRequestAdapter>({
      login(response, method) {
        expect(response.total).toBe(300);
        expect(method).toBeInstanceOf(Method);
        loginInterceptorFn();
      }
    });
    const alovaInst = createAlova({
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter,
      localCache: null,
      beforeRequest: onAuthRequired(),
      responded: onResponseRefreshToken()
    });
    const loginMethod = alovaInst.Get<ListResponse>('/list');
    loginMethod.meta = {
      authRole: 'login'
    };
    const res = await loginMethod;
    expect(res.list).toStrictEqual(generateContinuousNumbers(9));
    expect(loginInterceptorFn).toHaveBeenCalledTimes(1);

    const { onAuthRequired: onAuthRequired2, onResponseRefreshToken: onResponseRefreshToken2 } =
      createClientTokenAuthentication<typeof mockRequestAdapter>({
        login: {
          metaMatches: {
            login: true
          },
          handler(response, method) {
            expect(response.total).toBe(300);
            expect(method).toBeInstanceOf(Method);
            loginInterceptorFn();
          }
        }
      });
    const alovaInst2 = createAlova({
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter,
      localCache: null,
      beforeRequest: onAuthRequired2(),
      responded: onResponseRefreshToken2()
    });
    const loginMethod2 = alovaInst2.Get<ListResponse>('/list');
    loginMethod2.meta = {
      login: true
    };
    const res2 = await loginMethod2;
    expect(res2.list).toStrictEqual(generateContinuousNumbers(9));
    expect(loginInterceptorFn).toHaveBeenCalledTimes(2);
  });
  test('should emit logout interceptor when set authRole to `logout`', async () => {
    const logoutInterceptorFn = jest.fn();
    const { onAuthRequired, onResponseRefreshToken } = createClientTokenAuthentication<typeof mockRequestAdapter>({
      logout(response, method) {
        expect(response.total).toBe(300);
        expect(method).toBeInstanceOf(Method);
        logoutInterceptorFn();
      }
    });
    const alovaInst = createAlova({
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter,
      localCache: null,
      beforeRequest: onAuthRequired(),
      responded: onResponseRefreshToken()
    });
    const logoutMethod = alovaInst.Get<ListResponse>('/list');
    logoutMethod.meta = {
      authRole: 'logout'
    };
    const res = await logoutMethod;
    expect(res.list).toStrictEqual(generateContinuousNumbers(9));
    expect(logoutInterceptorFn).toHaveBeenCalledTimes(1);

    const { onAuthRequired: onAuthRequired2, onResponseRefreshToken: onResponseRefreshToken2 } =
      createClientTokenAuthentication<typeof mockRequestAdapter>({
        logout: {
          metaMatches: {
            logout: true
          },
          handler(response, method) {
            expect(response.total).toBe(300);
            expect(method).toBeInstanceOf(Method);
            logoutInterceptorFn();
          }
        }
      });
    const alovaInst2 = createAlova({
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter,
      localCache: null,
      beforeRequest: onAuthRequired2(),
      responded: onResponseRefreshToken2()
    });
    const logoutMethod2 = alovaInst2.Get<ListResponse>('/list');
    logoutMethod2.meta = {
      logout: true
    };
    const res2 = await logoutMethod2;
    expect(res2.list).toStrictEqual(generateContinuousNumbers(9));
    expect(logoutInterceptorFn).toHaveBeenCalledTimes(2);
  });
  test('should refresh token first when it is expired', async () => {
    let token = '';
    const refreshTokenFn = jest.fn();
    const beforeRequestFn = jest.fn();
    const { onAuthRequired, onResponseRefreshToken } = createClientTokenAuthentication<typeof mockRequestAdapter>({
      refreshToken: {
        isExpired: () => !token,
        handler: async method => {
          expect(method).toBeInstanceOf(Method);
          const refreshMethod = alovaInst.Get<{ token: string }>('/refresh-token');
          refreshMethod.meta = {
            authRole: 'refreshToken'
          };
          token = (await refreshMethod).token;
          refreshTokenFn();
        }
      }
    });
    const alovaInst = createAlova({
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter,
      localCache: null,
      beforeRequest: onAuthRequired(({ config }) => {
        beforeRequestFn();
        config.headers.Authorization = token;
      }),
      responded: onResponseRefreshToken()
    });
    const list = await alovaInst.Get<number[]>('/list-auth');
    expect(list).toStrictEqual(generateContinuousNumbers(5));
    expect(refreshTokenFn).toHaveBeenCalledTimes(1);
    expect(beforeRequestFn).toHaveBeenCalledTimes(2);
  });
  test('the requests should wait until token refreshed when token is refreshing', async () => {
    let token = '';
    const refreshTokenFn = jest.fn();
    const beforeRequestFn = jest.fn();
    const { onAuthRequired, onResponseRefreshToken } = createClientTokenAuthentication<typeof mockRequestAdapter>({
      refreshToken: {
        isExpired: () => !token,
        handler: async method => {
          expect(method).toBeInstanceOf(Method);
          const refreshMethod = alovaInst.Get<{ token: string }>('/refresh-token');
          refreshMethod.meta = {
            authRole: 'refreshToken'
          };
          token = (await refreshMethod).token;
          refreshTokenFn();
        }
      }
    });
    const alovaInst = createAlova({
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter,
      localCache: null,
      beforeRequest: onAuthRequired(({ config }) => {
        beforeRequestFn();
        config.headers.Authorization = token;
      }),
      responded: onResponseRefreshToken((response, method) => {
        expect(method.config.headers.Authorization).toBe('123');
        return response;
      })
    });
    const method = alovaInst.Get<number[]>('/list-auth');
    const [list, list2] = await Promise.all([method, method]);
    expect(list).toStrictEqual(generateContinuousNumbers(5));
    expect(list2).toStrictEqual(generateContinuousNumbers(5));
    expect(refreshTokenFn).toHaveBeenCalledTimes(1); // 多次请求，只会刷新一次token
    expect(beforeRequestFn).toHaveBeenCalledTimes(3); // 两次list-auth，1次refresh-token
  });
  test("shouldn't continue run when throw in refreshToken", async () => {});
  test('should emit bypass the token validation when set authRole to null', async () => {
    let token = '';
    const refreshTokenFn = jest.fn();
    const { onAuthRequired, onResponseRefreshToken } = createClientTokenAuthentication<typeof mockRequestAdapter>({
      refreshToken: {
        isExpired: () => !token,
        handler: async method => {
          expect(method).toBeInstanceOf(Method);
          const refreshMethod = alovaInst.Get<{ token: string }>('/refresh-token');
          refreshMethod.meta = {
            authRole: 'refreshToken'
          };
          token = (await refreshMethod).token;
          refreshTokenFn();
        }
      }
    });
    const alovaInst = createAlova({
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter,
      localCache: null,
      beforeRequest: onAuthRequired(({ config }) => {
        config.headers.Authorization = token;
      }),
      responded: onResponseRefreshToken((response, method) => {
        expect(method.config.headers.Authorization).toBe('');
        return response;
      })
    });
    const method = alovaInst.Get<ListResponse>('/list');
    method.meta = {
      authRole: null
    };
    const { list } = await method;
    expect(list).toStrictEqual(generateContinuousNumbers(9));
    expect(refreshTokenFn).toHaveBeenCalledTimes(0); // authRole=null会直接放行
  });
});
