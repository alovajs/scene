import { T$, T$$, TonMounted$, Tupd$, Twatch$, T_$, T_exp$, TonUnmounted$ } from '@/framework/type';
import { AlovaMethodHandler, Method, useRequest } from 'alova';
import { getConfig, getHandlerMethod, useCallback } from '@/helper';
import { buildCompletedURL } from '@/functions/sendRequest';
import {
  AlovaSSEErrorEvent,
  AlovaSSEEvent,
  AlovaSSEMessageEvent,
  SSEHookConfig,
  SSEHookReadyState,
  SSEOn,
  SSEOnErrorTrigger,
  SSEOnMessageTrigger,
  SSEOnOpenTrigger
} from '~/typings/general';

// !! interceptByGlobalResponded 参数 尚未实现

export default <S, E, R, T, RC, RE, RH>(
  handler: Method<S, E, R, T, RC, RE, RH> | AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
  config: SSEHookConfig = {},
  $: T$,
  $$: T$$,
  _$: T_$,
  _exp$: T_exp$,
  upd$: Tupd$,
  watch$: Twatch$,
  onMounted$: TonMounted$,
  onUnmounted$: TonUnmounted$
  // useFlag$: TuseFlag$,
  // useMemorizedCallback$: TuseMemorizedCallback$
) => {
  // SSE 不需要传参（吧？）
  const methodInstance = getHandlerMethod(handler);
  const { baseURL, url } = methodInstance;
  const { params, transformData, headers } = getConfig(methodInstance);

  const fullURL = buildCompletedURL(baseURL, url, params);
  const eventSource = new EventSource(fullURL, { withCredentials: config.withCredentials });

  const { data, update } = useRequest(handler, config);
  const readyState = $<SSEHookReadyState>(SSEHookReadyState.CONNECTING);

  // type: eventname & useCallback()
  const eventMap: Map<string, ReturnType<typeof useCallback>> = new Map();
  const [onOpen, triggerOnOpen, offOpen] = useCallback<SSEOnOpenTrigger>();
  const [onMessage, triggerOnMessage, offMessage] = useCallback<SSEOnMessageTrigger<any>>();
  const [onError, triggerOnError, offError] = useCallback<SSEOnErrorTrigger>();

  const dataHandler = (data: any) => {
    const transformedData = transformData ? transformData(data, (headers || {}) as RH) : data;
    update({ data: transformedData });
    return data;
  };

  // 将 SourceEvent 产生的事件变为 AlovaSSEHook 的事件
  const createSSEEvent = (eventName: string, event: MessageEvent<any> | Event) => {
    if (eventName === 'open') {
      return {
        method: methodInstance,
        eventSource
      } as AlovaSSEEvent;
    }
    if (eventName === 'error') {
      return {
        method: methodInstance,
        eventSource,
        error: new Error('sse error')
      } as AlovaSSEErrorEvent;
    }

    // 其余名称的事件都是（类）message 的事件，data 交给 dataHandler 处理
    return {
      method: methodInstance,
      eventSource,
      data: dataHandler((event as MessageEvent).data)
    } as AlovaSSEMessageEvent<any>;
  };

  const on: SSEOn = (eventName, handler) => {
    if (!eventMap.has(eventName)) {
      const useCallbackObject = useCallback<(event: AlovaSSEEvent) => void>(callbacks => {
        if (callbacks.length === 0) {
          eventSource.removeEventListener(eventName, useCallbackObject[1] as any);
          eventMap.delete(eventName);
        }
      });

      const trigger = useCallbackObject[1];
      eventMap.set(eventName, useCallbackObject);
      eventSource.addEventListener(eventName, event => {
        trigger(createSSEEvent(eventName, event));
      });
    }

    const [onEvent] = eventMap.get(eventName)!;

    return onEvent(handler);
  };

  eventSource.addEventListener('open', event => {
    upd$(readyState, SSEHookReadyState.OPEN);
    triggerOnOpen(createSSEEvent('open', event));
  });
  eventSource.addEventListener('error', event => {
    upd$(readyState, SSEHookReadyState.CLOSED);
    triggerOnError(createSSEEvent('error', event) as AlovaSSEErrorEvent);
  });
  eventSource.addEventListener('message', event => {
    triggerOnMessage(createSSEEvent('message', event) as AlovaSSEMessageEvent<any>);
  });

  onUnmounted$(() => {
    offOpen();
    offMessage();
    offError();
  });

  return {
    readyState: _exp$(readyState),
    data,
    eventSource,
    onMessage,
    onError,
    onOpen,
    on
  };
};
