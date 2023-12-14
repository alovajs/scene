import { __self, newInstance, noop, pushItem } from '@/helper';
import { PromiseCls, falseValue } from '@/helper/variables';
import { AlovaRequestAdapter } from 'alova';
import {
  ClientTokenAuthenticationOptions,
  ServerTokenAuthenticationOptions,
  TokenAuthenticationResult
} from '~/typings/general';
import {
  PosibbleAuthMap,
  callHandlerIfMatchesMeta,
  checkMethodRole,
  defaultIgnoreMeta,
  defaultLoginMeta,
  defaultLogoutMeta,
  defaultRefreshTokenMeta,
  onResponded2Record,
  refreshTokenIfExpired
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
    waitingList: (typeof noop)[] = [];
  return {
    onAuthRequired: onBeforeRequest => async method => {
      if (
        !checkMethodRole(method, ignoreMetas || defaultIgnoreMeta) &&
        !checkMethodRole(method, (login as PosibbleAuthMap)?.metaMatches || defaultLoginMeta) &&
        !checkMethodRole(method, (refreshToken as PosibbleAuthMap)?.metaMatches || defaultRefreshTokenMeta)
      ) {
        // 如果正在刷新token，则等待刷新完成后再发请求
        if (tokenRefreshing) {
          await newInstance(PromiseCls, resolve => {
            pushItem(waitingList, resolve);
          });
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
    waitingList: (typeof noop)[] = [];
  return {
    onAuthRequired: onBeforeRequest => async method => {
      if (
        !checkMethodRole(method, ignoreMetas || defaultIgnoreMeta) &&
        !checkMethodRole(method, (login as PosibbleAuthMap)?.metaMatches || defaultLoginMeta)
      ) {
        // 如果正在刷新token，则等待刷新完成后再发请求
        if (tokenRefreshing) {
          await newInstance(PromiseCls, resolve => {
            pushItem(waitingList, resolve);
          });
        }
      }
      onBeforeRequest?.(method);
    },
    onResponseRefreshToken: onRespondedHandlers => {
      const respondedRecord = onResponded2Record(onRespondedHandlers);
      return {
        ...respondedRecord,
        onSuccess: async (response, method) => {
          const dataResent = await refreshTokenIfExpired(
            method,
            waitingList,
            refreshing => (tokenRefreshing = refreshing),
            [response, method],
            refreshTokenOnSuccess
          );
          if (dataResent) {
            return dataResent;
          }

          callHandlerIfMatchesMeta(method, login, defaultLoginMeta, response);
          callHandlerIfMatchesMeta(method, logout, defaultLogoutMeta, response);
          return (respondedRecord.onSuccess || __self)(response, method);
        },
        onError: async (error, method) => {
          const dataResent = await refreshTokenIfExpired(
            method,
            waitingList,
            refreshing => (tokenRefreshing = refreshing),
            [error, method],
            refreshTokenOnError
          );
          if (dataResent) {
            return dataResent;
          }
          return (respondedRecord.onError || noop)(error, method);
        }
      };
    }
  } as TokenAuthenticationResult<AlovaRequestAdapter<any, any, any, any, any>>;
};
