import { AlovaMethodHandler, AlovaMiddleware, Method } from 'alova';
import {
  BeforePushQueueHandler,
  FallbackHandler,
  PushedQueueHandler,
  RetryHandler,
  SQHookConfig
} from '../../../typings';
import {
  GeneralFn,
  isFn,
  len,
  newInstance,
  objectKeys,
  promiseResolve,
  promiseThen,
  pushItem,
  runArgsHandler,
  walkObject
} from '../../helper';
import {
  behaviorQueue,
  behaviorSilent,
  behaviorStatic,
  PromiseCls,
  trueValue,
  undefinedValue
} from '../../helper/variables';
import createSQEvent from './createSQEvent';
import {
  globalVirtualResponseLock,
  setVDataIdCollectBasket,
  silentAssert,
  vDataIdCollectBasket
} from './globalVariables';
import { MethodHandler, SilentMethod } from './SilentMethod';
import { pushNewSilentMethod2Queue } from './silentQueue';
import createVirtualResponse from './virtualResponse/createVirtualResponse';
import stringifyVData from './virtualResponse/stringifyVData';
import { regVDataId } from './virtualResponse/variables';

/**
 * 全局的silentMethod实例，它将在第一个成功事件触发前到最后一个成功事件触发后有值（同步时段）
 * 通过此方式让onSuccess中的updateStateEffect内获得当前的silentMethod实例
 */
export let currentSilentMethod: SilentMethod | undefined = undefinedValue;

/**
 * 创建SilentQueue中间件函数
 * @param config 配置对象
 * @returns 中间件函数
 */
export default <S, E, R, T, RC, RE, RH>(
  handler: Method<S, E, R, T, RC, RE, RH> | AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
  config?: SQHookConfig<S, E, R, T, RC, RE, RH>
) => {
  const { behavior = 'queue', queue, retryError, maxRetryTimes, backoff } = config || {};
  const fallbackHandlers: FallbackHandler<S, E, R, T, RC, RE, RH>[] = [];
  const beforePushQueueHandlers: BeforePushQueueHandler<S, E, R, T, RC, RE, RH>[] = [];
  const pushedQueueHandlers: PushedQueueHandler<S, E, R, T, RC, RE, RH>[] = [];
  const retryHandlers: RetryHandler<S, E, R, T, RC, RE, RH>[] = [];
  let handlerArgs: any[] | undefined;

  /**
   * method实例创建函数
   * @param {any[]} args 调用send传入的函数
   * @returns {Method}
   */
  const createMethod = (...args: any[]) => {
    silentAssert(isFn(handler), 'method handler must be a function. eg. useSQRequest(() => method)');
    setVDataIdCollectBasket({});
    handlerArgs = args;
    return (handler as MethodHandler<S, E, R, T, RC, RE, RH>)(...args);
  };

  /**
   * 中间件函数
   * @param context 请求上下文，包含请求相关的值
   * @param next 继续执行函数
   * @returns {Promise}
   */
  const middleware: AlovaMiddleware<S, E, R, T, RC, RE, RH> = (
    { method, sendArgs, statesUpdate, decorateSuccess, decorateError, decorateComplete, config },
    next
  ) => {
    // 因为behavior返回值可能会变化，因此每次请求都应该调用它重新获取返回值
    const behaviorFinally = isFn(behavior) ? behavior() : behavior;
    const { silentDefaultResponse, vDataCaptured } = config;
    let silentMethodInstance: any;

    // 首先设置事件回调装饰器
    // 将响应对应的事件实例创建函数暂存到createFinishedEvent中，在complete事件触发时直接调用此函数即可获得对应状态的事件实例
    let createFinishedEvent: GeneralFn | undefined = undefinedValue;
    decorateSuccess((handler, args, index, length) => {
      // 开锁，详情请看globalVirtualResponseLock
      if (index === 0) {
        globalVirtualResponseLock.v = 0;
        currentSilentMethod = silentMethodInstance;
      }
      createFinishedEvent =
        createFinishedEvent ||
        (() =>
          createSQEvent(
            3,
            behaviorFinally,
            method,
            silentMethodInstance,
            undefinedValue,
            undefinedValue,
            sendArgs,
            args[0]
          ));
      handler(createFinishedEvent() as any);

      // 所有成功回调执行完后再锁定虚拟数据，锁定后虚拟响应数据内不能再访问任意层级
      // 锁定操作只在silent模式下，用于锁定虚拟数据的生成操作
      if (index === length - 1) {
        // 锁定，详情请看globalVirtualResponseLock
        globalVirtualResponseLock.v = 2;
        currentSilentMethod = undefinedValue;
      }
    });
    decorateError((handler, args) => {
      createFinishedEvent =
        createFinishedEvent ||
        (() =>
          createSQEvent(
            4,
            behaviorFinally,
            method,
            silentMethodInstance,
            undefinedValue,
            undefinedValue,
            sendArgs,
            undefinedValue,
            undefinedValue,
            args[0]
          ));
      handler(createFinishedEvent() as any);
    });
    decorateComplete(handler => {
      handler(createFinishedEvent?.() as any);
    });

    // 置空临时收集变量
    // 返回前都需要置空它们
    const resetCollectBasket = () => {
      setVDataIdCollectBasket((handlerArgs = undefinedValue));
    };

    // 如果设置了vDataCaptured，则先判断内是否包含虚拟数据
    if (isFn(vDataCaptured)) {
      let hasVData = vDataIdCollectBasket && len(objectKeys(vDataIdCollectBasket)) > 0;
      if (!hasVData) {
        walkObject(method, value => {
          if (!hasVData && (stringifyVData(value) || regVDataId.test(value))) {
            hasVData = trueValue;
          }
          return value;
        });
      }

      // 如果vDataCaptured有返回数据，则使用它作为响应数据，否则继续请求
      const customResponse = hasVData ? vDataCaptured(method) : undefinedValue;
      if (customResponse !== undefinedValue) {
        resetCollectBasket(); // 被vDataCaptured捕获时的重置
        return promiseResolve(customResponse);
      }
    }

    if (behaviorFinally !== behaviorStatic) {
      // 等待队列中的method执行完毕
      const queueResolvePromise = newInstance(PromiseCls, (resolveHandler, rejectHandler) => {
        silentMethodInstance = newInstance(
          SilentMethod,
          method as Method<any, any, any, any, any, any, any>,
          behaviorFinally,
          undefinedValue,
          retryError,
          maxRetryTimes,
          backoff,
          fallbackHandlers as any[],
          resolveHandler,
          rejectHandler,
          handlerArgs,
          vDataIdCollectBasket && objectKeys(vDataIdCollectBasket),
          retryHandlers as any[]
        );
        resetCollectBasket(); // behavior为queue和silent时的重置
      });

      // onBeforePush和onPushed事件是同步绑定的，因此需要异步执行入队列才能正常触发事件
      promiseThen(promiseResolve(undefinedValue), () => {
        const createPushEvent = () =>
          createSQEvent(2, behaviorFinally, method, silentMethodInstance, undefinedValue, undefinedValue, sendArgs);

        // 将silentMethod放入队列并持久化
        pushNewSilentMethod2Queue(
          silentMethodInstance,
          // onFallback绑定了事件后，即使是silent行为模式也不再存储
          // onFallback会同步调用，因此需要异步判断是否存在fallbackHandlers
          len(fallbackHandlers) <= 0 && behaviorFinally === behaviorSilent,
          queue,
          () => {
            // 执行放入队列前回调
            runArgsHandler(beforePushQueueHandlers, createPushEvent());
          }
        );
        // 执行放入队列后回调
        runArgsHandler(pushedQueueHandlers, createPushEvent());
      });

      if (behaviorFinally === behaviorQueue) {
        statesUpdate({
          // 手动设置为true
          loading: trueValue
        });
        return queueResolvePromise;
      }

      // 在silent模式下创建虚拟响应数据，虚拟响应数据可生成任意的虚拟数据
      const virtualResponse = (silentMethodInstance.virtualResponse = createVirtualResponse(
        isFn(silentDefaultResponse) ? silentDefaultResponse() : undefinedValue
      ));
      promiseThen(queueResolvePromise, realResponse => {
        // 获取到真实数据后更新过去
        statesUpdate({
          data: realResponse
        });
      });

      // silent模式下，先立即返回虚拟响应值，然后当真实数据返回时再更新
      return promiseResolve(virtualResponse);
    }
    resetCollectBasket(); // behavior为static时的重置
    return next();
  };

  return {
    c: createMethod,
    m: middleware,

    // 事件绑定函数
    b: {
      /**
       * 绑定回退事件
       * @param handler 回退事件回调
       */
      onFallback: (handler: FallbackHandler<S, E, R, T, RC, RE, RH>) => {
        pushItem(fallbackHandlers, handler);
      },

      /**
       * 绑定入队列前事件
       * @param handler 入队列前的事件回调
       */
      onBeforePushQueue: (handler: BeforePushQueueHandler<S, E, R, T, RC, RE, RH>) => {
        pushItem(beforePushQueueHandlers, handler);
      },

      /**
       * 绑定入队列后事件
       * @param handler 入队列后的事件回调
       */
      onPushedQueue: (handler: PushedQueueHandler<S, E, R, T, RC, RE, RH>) => {
        pushItem(pushedQueueHandlers, handler);
      },

      /**
       * 重试事件
       * @param handler 重试事件回调
       */
      onRetry: (handler: RetryHandler<S, E, R, T, RC, RE, RH>) => {
        pushItem(retryHandlers, handler);
      }
    }
  };
};
