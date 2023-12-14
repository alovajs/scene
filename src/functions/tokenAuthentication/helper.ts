import { forEach, instanceOf, isFn, isPlainOrCustomObject, len, noop, splice } from '@/helper';
import { PromiseCls, falseValue, trueValue, undefinedValue } from '@/helper/variables';
import { AlovaRequestAdapter, Method, ResponseCompleteHandler, ResponseErrorHandler, ResponsedHandler } from 'alova';
import { AlovaResponded, MetaMatches, ResponseAuthorizationInterceptor } from '~/typings/general';

export type PosibbleAuthMap =
  | {
      metaMatches?: MetaMatches;
      handler: any;
    }
  | undefined;
export const defaultIgnoreMeta = {
    authRole: null
  },
  defaultLoginMeta = {
    authRole: 'login'
  },
  defaultLogoutMeta = {
    authRole: 'logout'
  },
  defaultRefreshTokenMeta = {
    authRole: 'refreshToken'
  },
  checkMethodRole = ({ meta }: Method, metaMatches: MetaMatches) => {
    if (isPlainOrCustomObject<Record<string, any>>(meta)) {
      for (const key in meta) {
        const matchedMetaItem = metaMatches[key];
        if (instanceOf(matchedMetaItem, RegExp) ? matchedMetaItem.test(meta[key]) : meta[key] === matchedMetaItem) {
          return trueValue;
        }
      }
    }
    return falseValue;
  },
  callHandlerIfMatchesMeta = (
    method: Method,
    authorizationInterceptor:
      | ResponseAuthorizationInterceptor<AlovaRequestAdapter<any, any, any, any, any>>
      | undefined,
    defaultMeta: MetaMatches,
    response: any
  ) => {
    if (checkMethodRole(method, (authorizationInterceptor as PosibbleAuthMap)?.metaMatches || defaultMeta)) {
      const handler = isFn(authorizationInterceptor)
        ? authorizationInterceptor
        : isPlainOrCustomObject<NonNullable<typeof authorizationInterceptor>>(authorizationInterceptor) &&
          isFn(authorizationInterceptor.handler)
        ? authorizationInterceptor.handler
        : noop;
      handler(response, method);
    }
  },
  refreshTokenIfExpired = async (
    method: Method,
    waitingList: (typeof noop)[],
    updateRefreshStatus: (status: boolean) => void,
    handlerParams: any[],
    refreshToken?: {
      isExpired: (...args: any[]) => boolean | Promise<boolean>;
      handler: (...args: any[]) => Promise<void>;
    }
  ) => {
    let isExpired = refreshToken?.isExpired(...handlerParams);
    // 兼容处理同步函数和异步函数
    if (instanceOf(isExpired, PromiseCls)) {
      isExpired = await isExpired;
    }

    if (
      isExpired &&
      !checkMethodRole(method, (refreshToken as PosibbleAuthMap)?.metaMatches || defaultRefreshTokenMeta)
    ) {
      try {
        updateRefreshStatus(trueValue);

        // 调用刷新token
        await refreshToken?.handler(...handlerParams);
        updateRefreshStatus(falseValue);
        // 刷新token完成后，通知等待列表中的请求
        forEach(waitingList, resolve => resolve());

        // 当handleParams数量大于2时，说明是从响应中调用此函数的，此时需要重新请求原接口
        if (len(handlerParams) >= 2) {
          // 这里因为是重新请求原接口，与上一次请求叠加会导致重复调用transformData，因此需要将transformData置空去除一次调用
          const config = method.config,
            methodTransformData = config.transformData;
          config.transformData = undefinedValue;
          const resentData = await method;
          config.transformData = methodTransformData;
          return resentData;
        }
      } finally {
        updateRefreshStatus(falseValue);
        splice(waitingList, 0, len(waitingList)); // 清空waitingList
      }
    }
  },
  onResponded2Record = (onRespondedHandlers?: AlovaResponded<AlovaRequestAdapter<any, any, any, any, any>>) => {
    let successHandler: ResponsedHandler<any, any, any, any, any> | undefined = undefinedValue,
      errorHandler: ResponseErrorHandler<any, any, any, any, any> | undefined = undefinedValue,
      onCompleteHandler: ResponseCompleteHandler<any, any, any, any, any> | undefined = undefinedValue;
    if (isFn(onRespondedHandlers)) {
      successHandler = onRespondedHandlers;
    } else if (isPlainOrCustomObject<NonNullable<typeof onRespondedHandlers>>(onRespondedHandlers)) {
      const { onSuccess, onError, onComplete } = onRespondedHandlers;
      successHandler = isFn(onSuccess) ? onSuccess : successHandler;
      errorHandler = isFn(onError) ? onError : errorHandler;
      onCompleteHandler = isFn(onComplete) ? onComplete : onCompleteHandler;
    }
    return {
      onSuccess: successHandler,
      onError: errorHandler,
      onComplete: onCompleteHandler
    };
  };
