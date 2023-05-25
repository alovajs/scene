import {
  buildErrorMsg,
  clearTimeoutFn,
  createAssert,
  delayWithBackoff,
  isNumber,
  noop,
  promiseCatch,
  promiseReject,
  promiseResolve,
  promiseThen,
  pushItem,
  runArgsHandler,
  setTimeoutFn
} from '@/helper';
import createHookEvent from '@/helper/createHookEvent';
import { falseValue, trueValue, undefinedValue } from '@/helper/variables';
import { AlovaMethodHandler, Method, useRequest } from 'alova';
import { RetriableFailEvent, RetriableHookConfig, RetriableRetryEvent } from '~/typings/general';

type RetryHandler<S, E, R, T, RC, RE, RH> = (event: RetriableRetryEvent<S, E, R, T, RC, RE, RH>) => void;
type FailHandler<S, E, R, T, RC, RE, RH> = (event: RetriableFailEvent<S, E, R, T, RC, RE, RH>) => void;
const hookPrefix = 'useRetriableRequest';
const assert = createAssert(hookPrefix);
export default <S, E, R, T, RC, RE, RH>(
  handler: Method<S, E, R, T, RC, RE, RH> | AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
  config: RetriableHookConfig<S, E, R, T, RC, RE, RH>
) => {
  const { retry = 3, backoff = { delay: 1000 }, middleware = noop } = config;
  const retryHandlers: RetryHandler<S, E, R, T, RC, RE, RH>[] = [];
  const failHandlers: FailHandler<S, E, R, T, RC, RE, RH>[] = [];
  let retryTimes = 0;

  // 停止错误对象，在手动触发停止时有值
  let stopManuallyError: Error | undefined = undefinedValue;
  let methodInstanceLastest: Method<S, E, R, T, RC, RE, RH>;
  let sendArgsLatest: any[];
  let currentLoadingState = falseValue;
  let requesting = falseValue; // 是否正在请求
  let retryTimer: NodeJS.Timer;

  const emitOnFail = (method: Method<S, E, R, T, RC, RE, RH>, sendArgs: any[], error: any) => {
    // 需要异步触发onFail，让onError和onComplete先触发
    setTimeoutFn(() => {
      runArgsHandler(
        failHandlers,
        createHookEvent(
          10,
          method,
          undefinedValue,
          undefinedValue,
          undefinedValue,
          retryTimes,
          undefinedValue,
          sendArgs,
          undefinedValue,
          undefinedValue,
          error
        )
      );
      stopManuallyError = undefinedValue;
      retryTimes = 0; // 重置已重试次数
    });
  };

  /**
   * 停止重试，只在重试期间调用有效
   * 如果正在请求中，则触发中断请求，让请求错误来抛出错误，否则手动修改状态以及触发onFail
   * 停止后将立即触发onFail事件
   */
  const stop = () => {
    assert(currentLoadingState, 'there are no requests being retried');
    stopManuallyError = new Error(buildErrorMsg(hookPrefix, 'stop retry manually'));
    if (requesting) {
      requestReturns.abort();
    } else {
      emitOnFail(methodInstanceLastest, sendArgsLatest, stopManuallyError);
      requestReturns.update({ error: stopManuallyError, loading: falseValue });
      currentLoadingState = falseValue;
      clearTimeoutFn(retryTimer); // 清除重试定时器
    }
  };
  const requestReturns = useRequest(handler, {
    ...config,
    middleware(ctx, next) {
      middleware(
        {
          ...ctx,
          delegatingActions: {
            stop
          }
        } as any,
        () => promiseResolve(undefinedValue as any)
      );
      const { update, sendArgs, send, method, controlLoading } = ctx;
      const setLoading = (loading = falseValue) => {
        if (loading !== currentLoadingState) {
          update({ loading });
          currentLoadingState = loading;
        }
      };
      controlLoading();
      setLoading(trueValue);
      methodInstanceLastest = method;
      sendArgsLatest = sendArgs;
      requesting = trueValue;
      return promiseThen(
        next(),

        // 请求成功时设置loading为false
        val => {
          retryTimes = 0; // 重置已重试次数
          requesting = falseValue;
          setLoading();
          return val;
        },

        // 请求失败时触发重试机制
        error => {
          // 没有手动触发停止，以及重试次数未到达最大时触发重试
          if (!stopManuallyError && (isNumber(retry) ? retryTimes < retry : retry(error))) {
            // 计算重试延迟时间
            const retryDelay = delayWithBackoff(backoff, ++retryTimes);
            // 延迟对应时间重试
            retryTimer = setTimeoutFn(() => {
              // 如果手动停止了则不再触发重试
              promiseCatch(send(...sendArgs), noop); // 捕获错误不再往外抛，否则重试时也会抛出错误
              // 触发重试事件
              runArgsHandler(
                retryHandlers,
                createHookEvent(
                  9,
                  method,
                  undefinedValue,
                  undefinedValue,
                  undefinedValue,
                  retryTimes,
                  retryDelay,
                  sendArgs
                )
              );
            }, retryDelay);
          } else {
            setLoading();
            error = stopManuallyError || error; // 如果stopManuallyError有值表示是通过stop函数触发停止的
            emitOnFail(method, sendArgs, error);
          }

          requesting = falseValue;
          // 返回reject执行后续的错误流程
          return promiseReject(error);
        }
      );
    }
  });

  /**
   * 重试事件绑定
   * 它们将在重试发起后触发
   * @param handler 重试事件回调
   */
  const onRetry = (handler: RetryHandler<S, E, R, T, RC, RE, RH>) => {
    pushItem(retryHandlers, handler);
  };

  /**
   * 失败事件绑定
   * 它们将在不再重试时触发，例如到达最大重试次数时，重试回调返回false时，手动调用stop停止重试时
   * 而alova的onError事件是在每次请求报错时都将被触发
   *
   * 注意：如果没有重试次数时，onError、onComplete和onFail会被同时触发
   *
   * @param handler 失败事件回调
   */
  const onFail = (handler: FailHandler<S, E, R, T, RC, RE, RH>) => {
    pushItem(failHandlers, handler);
  };

  return {
    ...requestReturns,
    stop,
    onRetry,
    onFail
  };
};
