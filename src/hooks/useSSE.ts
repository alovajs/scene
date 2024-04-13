import {
  T$,
  T$$,
  T_$,
  T_exp$,
  TonMounted$,
  TonUnmounted$,
  Tupd$,
  TuseFlag$,
  TuseMemorizedCallback$,
  Twatch$
} from '@/framework/type';
import { buildCompletedURL } from '@/functions/sendRequest';
import {
  __self,
  getConfig,
  getHandlerMethod,
  getMethodInternalKey,
  getOptions,
  instanceOf,
  isFn,
  isPlainOrCustomObject,
  noop,
  promiseCatch,
  promiseFinally,
  promiseThen,
  useCallback,
  usePromise
} from '@/helper';
import createHookEvent, { AlovaHookEventType } from '@/helper/createHookEvent';
import { trueValue, undefinedValue } from '@/helper/variables';
import {
  AlovaMethodHandler,
  Method,
  ResponseCompleteHandler,
  ResponseErrorHandler,
  ResponsedHandler,
  ResponsedHandlerRecord,
  invalidateCache,
  matchSnapshotMethod,
  updateState
} from 'alova';
import {
  AlovaSSEEvent,
  SSEHookConfig,
  SSEHookReadyState,
  SSEOn,
  SSEOnErrorTrigger,
  SSEOnMessageTrigger,
  SSEOnOpenTrigger,
  UsePromiseReturnType
} from '~/typings/general';

export default <Data, S, E, R, T, RC, RE, RH>(
  handler: Method<S, E, R, T, RC, RE, RH> | AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
  config: SSEHookConfig = {},
  $: T$,
  $$: T$$,
  _$: T_$,
  _exp$: T_exp$,
  upd$: Tupd$,
  watch$: Twatch$,
  onMounted$: TonMounted$,
  onUnmounted$: TonUnmounted$,
  useFlag$: TuseFlag$,
  useMemorizedCallback$: TuseMemorizedCallback$
) => {
  const {
    initialData,
    withCredentials,
    interceptByGlobalResponded = trueValue,
    /** abortLast = trueValue, */
    immediate = trueValue
  } = config;
  // ! 暂时不支持指定 abortLast
  const abortLast = trueValue;

  let eventSource = $<EventSource | undefined>(undefinedValue, trueValue);
  let sendPromiseObject = useFlag$<UsePromiseReturnType<void> | undefined>(undefinedValue);

  const data = $<Data>(initialData, trueValue);
  const readyState = $<SSEHookReadyState>(SSEHookReadyState.CLOSED, trueValue);

  let methodInstance = getHandlerMethod(handler);

  let responseUnified: ResponsedHandler<S, E, RC, RE, RH> | ResponsedHandlerRecord<S, E, RC, RE, RH> | undefined;

  // 储存自定义事件的 useCallback 对象，其中 key 为 eventName
  const customEventMap: Map<string, ReturnType<typeof useCallback>> = new Map();
  const [onOpen, triggerOnOpen, offOpen] = useCallback<SSEOnOpenTrigger<S, E, R, T, RC, RE, RH>>();
  const [onMessage, triggerOnMessage, offMessage] = useCallback<SSEOnMessageTrigger<Data, S, E, R, T, RC, RE, RH>>();
  const [onError, triggerOnError, offError] = useCallback<SSEOnErrorTrigger<S, E, R, T, RC, RE, RH>>();

  let responseSuccessHandler: ResponsedHandler<any, any, RC, RE, RH> = __self,
    responseErrorHandler: ResponseErrorHandler<any, any, RC, RE, RH> = noop,
    responseCompleteHandler: ResponseCompleteHandler<any, any, RC, RE, RH> = noop;

  /**
   * 设置响应拦截器，在每次 send 之后都需要调用
   */
  const setResponseHandler = (methodInstance: Method<S, E, R, T, RC, RE, RH>) => {
    const { responsed, responded } = getOptions(methodInstance);
    responseUnified = responded || responsed;

    if (isFn(responseUnified)) {
      responseSuccessHandler = responseUnified;
    } else if (responseUnified && isPlainOrCustomObject(responseUnified)) {
      const { onSuccess: successHandler, onError: errorHandler, onComplete: completeHandler } = responseUnified;
      responseSuccessHandler = isFn(successHandler) ? successHandler : responseSuccessHandler;
      responseErrorHandler = isFn(errorHandler) ? errorHandler : responseErrorHandler;
      responseCompleteHandler = isFn(completeHandler) ? completeHandler : responseCompleteHandler;
    }
  };

  /**
   * 处理响应任务，失败时不缓存数据
   * @param handlerReturns 拦截器返回后的数据
   * @param doNotCache 是否不要更新缓存
   * @returns 处理后的response
   */
  const handleResponseTask = async (handlerReturns: any, doNotCache?: boolean) => {
    const { headers, name: methodInstanceName, transformData: transformDataFn = __self } = getConfig(methodInstance);
    const methodKey = getMethodInternalKey(methodInstance);

    const returnsData = await handlerReturns;
    const transformedData = await transformDataFn(returnsData, (headers || {}) as RH);

    upd$(data, transformedData);

    if (!doNotCache) {
      updateState(methodInstance, { data: transformedData });
    }

    // 查找hitTarget
    const hitMethods = matchSnapshotMethod({
      filter: cachedMethod =>
        (cachedMethod.hitSource || []).some(sourceMatcher =>
          instanceOf(sourceMatcher, RegExp)
            ? sourceMatcher.test(methodInstanceName as string)
            : sourceMatcher === methodInstanceName || sourceMatcher === methodKey
        )
    });

    // 令符合条件(hitTarget定义)的method的缓存失效
    if (hitMethods.length > 0) {
      invalidateCache(hitMethods);
    }

    return transformedData;
  };

  /**
   * 处理收到的数据，调用响应拦截并转换数据
   * @param data EventSource 返回的数据
   * @url https://alova.js.org/zh-CN/tutorial/getting-started/global-interceptor#全局的响应拦截器
   * @returns 转换后的数据
   */
  const dataHandler = async (data: any) => {
    if (interceptByGlobalResponded) {
      // 如果需要响应拦截器处理
      // 1. 调用 responseSuccessHandler 处理
      //  1.1. 如果步骤 1 无异常抛出，则使用其返回的值传递给 transformDataFn 处理
      //  1.2. 如果步骤 1/2 抛出异常，则传递错误给 responseErrorHandler
      // 2. 最后，调用 responseCompleteHandler

      return promiseFinally(
        // eslint-disable-next-line prettier/prettier
        promiseCatch(
          handleResponseTask(responseSuccessHandler(data, methodInstance)),
          (error: any) => handleResponseTask(responseErrorHandler(error, methodInstance), true)
        ),
        // finally
        () => responseCompleteHandler(methodInstance)
      );
    }
    // 如果不需要响应拦截器处理
    return handleResponseTask(data);
  };

  /**
   * 将 SourceEvent 产生的事件变为 AlovaSSEHook 的事件
   */
  const createSSEEvent = async (eventName: string, event: MessageEvent<any> | Event) => {
    const es = _$(eventSource);
    if (!es) {
      throw new Error('eventSource is undefined');
    }

    const ev = (type: AlovaHookEventType, data?: any, error?: any) => {
      const event = createHookEvent(
        type,
        methodInstance,
        undefinedValue,
        undefinedValue,
        undefinedValue,
        undefinedValue,
        undefinedValue,
        undefinedValue,
        data,
        undefinedValue,
        error
      ) as AlovaSSEEvent<S, E, R, T, RC, RE, RH>;

      event.eventSource = es;

      return event;
    };

    if (eventName === 'open') {
      return ev(AlovaHookEventType.ScopedSQEvent);
    }
    if (eventName === 'error') {
      return ev(AlovaHookEventType.ScopedSQErrorEvent, undefinedValue, new Error('SSE Error'));
    }

    // 其余名称的事件都是（类）message 的事件，data 交给 dataHandler 处理
    const data = await dataHandler((event as MessageEvent<any>).data);
    return ev(AlovaHookEventType.ScopedSQSuccessEvent, data);
  };

  // * MARK: EventSource 的事件处理

  const onCustomEvent: SSEOn<S, E, R, T, RC, RE, RH> = useMemorizedCallback$((eventName, handler) => {
    if (!customEventMap.has(eventName)) {
      const useCallbackObject = useCallback<(event: AlovaSSEEvent<S, E, R, T, RC, RE, RH>) => void>(callbacks => {
        if (callbacks.length === 0) {
          _$(eventSource)?.removeEventListener(eventName, useCallbackObject[1] as any);
          customEventMap.delete(eventName);
        }
      });

      const trigger = useCallbackObject[1];
      customEventMap.set(eventName, useCallbackObject);
      _$(eventSource)?.addEventListener(eventName, event => {
        promiseThen(createSSEEvent(eventName, event), trigger as any);
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [onEvent] = customEventMap.get(eventName)!;

    return onEvent(handler);
  });

  /**
   * 取消自定义事件在 useCallback 中的注册
   */
  const offCustomEvent = () => {
    customEventMap.forEach(([_1, _2, offTrigger]) => {
      offTrigger();
    });
  };

  const esOpen = (event: Event) => {
    // resolve 使用 send() 时返回的 promise
    upd$(readyState, SSEHookReadyState.OPEN);
    promiseThen(createSSEEvent('open', event), triggerOnOpen as any);
    // ! 一定要在调用 onOpen 之后 resolve
    sendPromiseObject.current?.resolve();
  };

  const esError = (event: Event) => {
    upd$(readyState, SSEHookReadyState.CLOSED);
    promiseThen(createSSEEvent('error', event), triggerOnError as any);
    // ? 这里是否需要 close()
  };

  const esMessage = (event: MessageEvent<any>) => {
    promiseThen(createSSEEvent('message', event), triggerOnMessage as any);
  };

  /**
   * 关闭当前 eventSource 的注册
   */
  const close = useMemorizedCallback$(() => {
    const es = _$(eventSource);
    if (!es) {
      return;
    }

    if (sendPromiseObject.current) {
      // 如果 close 时 promise 还在
      sendPromiseObject.current.resolve();
    }

    // * MARK: 解绑事件处理
    es.close();
    es.removeEventListener('open', esOpen);
    es.removeEventListener('error', esError);
    es.removeEventListener('message', esMessage);
    upd$(readyState, SSEHookReadyState.CLOSED);

    // eventSource 关闭后，取消注册所有自定义事件
    // 否则可能造成内存泄露
    customEventMap.forEach(([_, eventTrigger], eventName) => {
      es.removeEventListener(eventName, eventTrigger);
    });
  });

  /**
   * 发送请求并初始化 eventSource
   */
  const connect = useMemorizedCallback$((...sendArgs: any[]) => {
    let es = _$(eventSource);
    if (es && abortLast) {
      // 当 abortLast === true，关闭之前的连接并重新建立
      close();
    }

    // 设置 send 函数使用的 promise 对象
    if (!sendPromiseObject.current) {
      sendPromiseObject.current = usePromise();
      // open 后清除 promise 对象
      sendPromiseObject.current.promise.finally(() => {
        sendPromiseObject.current = undefinedValue;
      });
    }

    methodInstance = getHandlerMethod(handler, sendArgs);
    // 设置响应拦截器
    setResponseHandler(methodInstance);

    const { params } = getConfig(methodInstance);
    const { baseURL, url } = methodInstance;
    const fullURL = buildCompletedURL(baseURL, url, params);

    // 建立连接
    es = new EventSource(fullURL, { withCredentials });
    upd$(readyState, SSEHookReadyState.CONNECTING);
    upd$(eventSource, es);

    // * MARK: 注册处理事件

    // 注册处理事件 open error message
    es.addEventListener('open', esOpen);
    es.addEventListener('error', esError);
    es.addEventListener('message', esMessage);

    // 以及 自定义时间
    // 如果在 connect（send）之前就使用了 on 监听，则 customEventMap 里就已经有事件存在
    customEventMap.forEach(([_, eventTrigger], eventName) => {
      es?.addEventListener(eventName, event => {
        promiseThen(createSSEEvent(eventName, event), eventTrigger as any);
      });
    });

    return sendPromiseObject.current!.promise;
  });

  onUnmounted$(() => {
    close();

    // 上面使用 eventSource.removeEventListener 只是断开了 eventSource 和 trigger 的联系
    // 这里是取消 useCallback 对象中的事件注册
    offOpen();
    offMessage();
    offError();
    offCustomEvent();
  });

  // * MARK: 初始化动作
  onMounted$(() => {
    if (immediate) {
      setTimeout(() => connect(), 0);
    }
  });

  // if (immediate) {
  //   setTimeout(() => connect(), 0);
  // }

  return {
    readyState: _exp$(readyState),
    data: _exp$(data),
    eventSource: _exp$(eventSource),
    send: connect,
    close,
    onMessage,
    onError,
    onOpen,
    on: onCustomEvent
  };
};
