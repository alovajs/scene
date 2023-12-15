import { noop, __self } from '@/helper';
import { falseValue } from '@/helper/variables';
import { AlovaRequestAdapter } from 'alova';
import {
  ClientTokenAuthenticationOptions,
  ServerTokenAuthenticationOptions,
  TokenAuthenticationResult
} from '~/typings/general';
import {
  callHandlerIfMatchesMeta,
  checkMethodRole,
  defaultIgnoreMeta,
  defaultLoginMeta,
  defaultLogoutMeta,
  defaultRefreshTokenMeta,
  onResponded2Record,
  PosibbleAuthMap,
  refreshTokenIfExpired,
  waitForTokenRefreshed,
  WaitingRequestList
} from './helper';

/**
 * 创建客户端的token认证拦截器
 * @param options 配置参数
 * @returns token认证拦截器函数
 */
export const createClientTokenAuthentication = ({
  ignoreMetas,
  login,
  logout,
  refreshToken
}: ClientTokenAuthenticationOptions<AlovaRequestAdapter<any, any, any, any, any>>) => {
  let tokenRefreshing = falseValue,
    waitingList: WaitingRequestList = [];
  return {
    waitingList,
    onAuthRequired: onBeforeRequest => async method => {
      // 被忽略的、登录、刷新token的请求不进行token认证
      if (
        !checkMethodRole(method, ignoreMetas || defaultIgnoreMeta) &&
        !checkMethodRole(method, (login as PosibbleAuthMap)?.metaMatches || defaultLoginMeta) &&
        !checkMethodRole(method, (refreshToken as PosibbleAuthMap)?.metaMatches || defaultRefreshTokenMeta)
      ) {
        // 如果正在刷新token，则等待刷新完成后再发请求
        if (tokenRefreshing) {
          await waitForTokenRefreshed(method, waitingList);
        }
        await refreshTokenIfExpired(
          method,
          waitingList,
          refreshing => (tokenRefreshing = refreshing),
          [method],
          refreshToken
        );
      }
      onBeforeRequest?.(method);
    },
    onResponseRefreshToken: onRespondedHandlers => {
      const respondedRecord = onResponded2Record(onRespondedHandlers);
      return {
        ...respondedRecord,
        onSuccess: (response, method) => {
          callHandlerIfMatchesMeta(method, login, defaultLoginMeta, response);
          callHandlerIfMatchesMeta(method, logout, defaultLogoutMeta, response);
          return (respondedRecord.onSuccess || __self)(response, method);
        }
      };
    }
  } as TokenAuthenticationResult<AlovaRequestAdapter<any, any, any, any, any>>;
};

/**
 * 创建服务端的token认证拦截器
 * @param options 配置参数
 * @returns token认证拦截器函数
 */
export const createServerTokenAuthentication = ({
  ignoreMetas,
  login,
  logout,
  refreshTokenOnSuccess,
  refreshTokenOnError
}: ServerTokenAuthenticationOptions<AlovaRequestAdapter<any, any, any, any, any>>) => {
  let tokenRefreshing = falseValue,
    waitingList: WaitingRequestList = [];
  return {
    waitingList,
    onAuthRequired: onBeforeRequest => async method => {
      // 被忽略的、登录、刷新token的请求不进行token认证
      if (
        !checkMethodRole(method, ignoreMetas || defaultIgnoreMeta) &&
        !checkMethodRole(method, (login as PosibbleAuthMap)?.metaMatches || defaultLoginMeta) &&
        !checkMethodRole(method, (refreshTokenOnSuccess as PosibbleAuthMap)?.metaMatches || defaultRefreshTokenMeta) &&
        !checkMethodRole(method, (refreshTokenOnError as PosibbleAuthMap)?.metaMatches || defaultRefreshTokenMeta)
      ) {
        // 如果正在刷新token，则等待刷新完成后再发请求
        if (tokenRefreshing) {
          await waitForTokenRefreshed(method, waitingList);
        }
      }
      onBeforeRequest?.(method);
    },
    onResponseRefreshToken: onRespondedHandlers => {
      const respondedRecord = onResponded2Record(onRespondedHandlers);
      return {
        ...respondedRecord,
        onSuccess: async (response, method) => {
          if (
            !checkMethodRole(method, ignoreMetas || defaultIgnoreMeta) &&
            !checkMethodRole(method, (login as PosibbleAuthMap)?.metaMatches || defaultLoginMeta) &&
            !checkMethodRole(method, (refreshTokenOnSuccess as PosibbleAuthMap)?.metaMatches || defaultRefreshTokenMeta)
          ) {
            const dataResent = await refreshTokenIfExpired(
              method,
              waitingList,
              refreshing => (tokenRefreshing = refreshing),
              [response, method],
              refreshTokenOnSuccess,
              tokenRefreshing
            );
            if (dataResent) {
              return dataResent;
            }
          }

          callHandlerIfMatchesMeta(method, login, defaultLoginMeta, response);
          callHandlerIfMatchesMeta(method, logout, defaultLogoutMeta, response);
          return (respondedRecord.onSuccess || __self)(response, method);
        },
        onError: async (error, method) => {
          if (
            !checkMethodRole(method, ignoreMetas || defaultIgnoreMeta) &&
            !checkMethodRole(method, (login as PosibbleAuthMap)?.metaMatches || defaultLoginMeta) &&
            !checkMethodRole(method, (refreshTokenOnError as PosibbleAuthMap)?.metaMatches || defaultRefreshTokenMeta)
          ) {
            const dataResent = await refreshTokenIfExpired(
              method,
              waitingList,
              refreshing => (tokenRefreshing = refreshing),
              [error, method],
              refreshTokenOnError,
              tokenRefreshing
            );
            if (dataResent) {
              return dataResent;
            }
          }
          return (respondedRecord.onError || noop)(error, method);
        }
      };
    }
  } as TokenAuthenticationResult<AlovaRequestAdapter<any, any, any, any, any>>;
};
