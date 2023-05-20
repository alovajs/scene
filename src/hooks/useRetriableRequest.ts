import {
  buildErrorMsg,
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
  // 停止标志，在手动触发停止时设置为true
  let stopManually = falseValue;

  const emitOnFail = (method: Method<S, E, R, T, RC, RE, RH>, sendArgs: any[], error: any) =>
    // 需要异步触发onFail，让onError和onComplete先触发
    setTimeoutFn(() =>
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
      )
    );

  let methodInstanceLastest: Method<S, E, R, T, RC, RE, RH>;
  let sendArgsLatest: any[];
  let retrying = falseValue; // 是否正在重试
  const requestReturns = useRequest(handler, {
    ...config,
    middleware(ctx, next) {
      middleware(
        {
          ...ctx,
          subscribeHandler: {
            stop
          }
        } as any,
        () => promiseResolve(undefinedValue as any)
      );
      const { update, sendArgs, send, method, controlLoading } = ctx;
      const setLoading = (loading = falseValue) => {
        !retrying && update({ loading });
      };
      controlLoading();
      setLoading(trueValue);
      methodInstanceLastest = method;
      sendArgsLatest = sendArgs;
      return promiseThen(
        next(),

        // 请求成功时设置loading为false
        val => {
          retrying = falseValue;
          setLoading();
          return val;
        },

        // 请求失败时触发重试机制
        error => {
          // 需要重试时继续重试
          if (isNumber(retry) ? retryTimes < retry : retry(error)) {
            retrying = trueValue;
            // 计算重试延迟时间
            const retryDelay = delayWithBackoff(backoff, ++retryTimes);
            // 延迟对应时间重试
            setTimeoutFn(() => {
              // 如果手动停止了则不再触发重试
              if (!stopManually) {
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
              }

              // 重置为false防止下次不触发重试
              stopManually = falseValue;
            }, retryDelay);
          } else {
            retrying = falseValue;
            setLoading();
            emitOnFail(method, sendArgs, error);
          }

          // 返回reject执行后续的错误流程
          return promiseReject(error);
        }
      );
    }
  });

  /**
   * 停止重试，只在重试期间调用有效
   * 停止后将立即触发onFail事件
   */
  const stop = () => {
    assert(retrying, 'there are no requests being retried');
    stopManually = trueValue;
    requestReturns.update({ loading: falseValue });
    emitOnFail(methodInstanceLastest, sendArgsLatest, new Error(buildErrorMsg(hookPrefix, 'stop retry manually')));
  };

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
