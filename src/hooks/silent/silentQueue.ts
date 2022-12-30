import { Method, updateState, UpdateStateCollection } from 'alova';
import { RetryErrorDetailed } from '../../../typings';
import {
  forEach,
  instanceOf,
  isObject,
  len,
  map,
  noop,
  objectKeys,
  promiseResolve,
  promiseThen,
  pushItem,
  runArgsHandler,
  setTimeoutFn,
  shift
} from '../../helper';
import { behaviorSilent, defaultQueueName, PromiseCls, undefinedValue } from '../../helper/variables';
import createSQEvent from './createSQEvent';
import {
  completeHandlers,
  errorHandlers,
  globalVirtualResponseLock,
  silentFactoryStatus,
  successHandlers
} from './globalVariables';
import { SilentMethod } from './SilentMethod';
import { persistSilentMethod, push2PersistentSilentQueue, removeSilentMethod } from './storage/silentMethodStorage';
import { deepReplaceVTag } from './virtualTag/helper';
import { serializeUndefFlag, symbolOriginalValue } from './virtualTag/variables';
import vtagStringify from './virtualTag/vtagStringify';

export type SilentQueueMap = Record<string, SilentMethod[]>;
/** 静默方法队列集合 */
export let silentQueueMap = {} as SilentQueueMap;

/**
 * 合并queueMap到silentMethod队列集合
 * @param queueMap silentMethod队列集合
 */
export const merge2SilentQueueMap = (queueMap: SilentQueueMap) => {
  forEach(objectKeys(queueMap), queueName => {
    silentQueueMap[queueName] = [...(silentQueueMap[queueName] || []), ...queueMap[queueName]];
  });
};

/**
 * 清除silentQueue内所有项（测试使用）
 */
export const clearSilentQueueMap = () => (silentQueueMap = {});

/**
 * 读取外部作用域引用的变量，如果是一个模块则动态加载它
 * @param closureScope 引用的外部数据集合
 * @returns 闭包内引用的实际数据集合
 */
export const readHandlerArgs = (handlerArgs: any[]) => {
  const scopedValuePromises = map(handlerArgs, scopeArgItem => {
    if (isObject(scopeArgItem) && len(objectKeys(scopeArgItem)) <= 2 && scopeArgItem.path) {
      const { path, module = 'default' } = scopeArgItem;
      return promiseThen(import(`../../../../${path}`), loadedModule => loadedModule[module]);
    }
    return promiseResolve(scopeArgItem);
  });
  return PromiseCls.all(scopedValuePromises);
};

/**
 * 重新生成下一个method实例，目的是将虚拟标签替换为实际数据
 * @param vtagResponse 虚拟id和对应真实数据的集合
 * @param targetQueue 目标队列
 */
const regenerateMethodEntity = (vtagResponse: Record<string, any>, silentMethodInstance: SilentMethod) => {
  // 替换handlerArgs内的虚拟标签
  const replacedHandlerArgs: any[] = deepReplaceVTag(
    // 因为undefined无法被序列化，因此handlerArgs中以serializeUndefFlag常量替代undefined
    silentMethodInstance.handlerArgs.map(arg => (arg === serializeUndefFlag ? undefinedValue : arg)),
    vtagResponse
  );
  // 替换closureScope内的虚拟标签
  return promiseThen(readHandlerArgs(replacedHandlerArgs), realHandlerArgs => {
    // 重新生成一个method实例并替换
    const newMethodInstance = silentMethodInstance.methodHandler(...realHandlerArgs);

    // 深层遍历entity对象，如果发现有虚拟标签或虚拟标签id，则替换为实际数据
    silentMethodInstance.entity = deepReplaceVTag(newMethodInstance, vtagResponse);

    // 如果method实例有更新，则重新持久化此silentMethod实例
    silentMethodInstance.cache && persistSilentMethod(silentMethodInstance);
  });
};

/**
 * 使用响应数据替换虚拟数据
 * @param response 真实响应数据
 * @param virtualResponse 虚拟响应数据
 * @returns 虚拟标签id所构成的对应真实数据集合
 */
const replaceVirtualResponseWithResponse = (virtualResponse: any, response: any) => {
  let vtagResponseMap = {} as Record<string, any>;
  const virtualTagId = vtagStringify(virtualResponse);
  virtualTagId !== virtualResponse && (vtagResponseMap[virtualTagId] = virtualResponse[symbolOriginalValue] = response);

  if (isObject(virtualResponse)) {
    for (const i in virtualResponse) {
      vtagResponseMap = {
        ...vtagResponseMap,
        ...replaceVirtualResponseWithResponse(virtualResponse[i], response?.[i])
      };
    }
  }
  return vtagResponseMap;
};

/**
 * 启动SilentMethod队列
 * 1. 静默提交将会放入队列中，并按顺序发送请求，只有等到前一个请求响应后才继续发送后面的请求
 * 2. 重试次数只有在未响应时才触发，在服务端响应错误或断网情况下，不会重试
 * 3. 在达到重试次数仍未成功时，当设置了nextRound（下一轮）时延迟nextRound指定的时间后再次请求，否则将在刷新后再次尝试
 * 4. 如果有resolveHandler和rejectHandler，将在请求完成后（无论成功还是失败）调用，通知对应的请求继续响应
 *
 * @param queue SilentMethod队列
 */
export const bootSilentQueue = (queue: SilentMethod[], queueName: string) => {
  const silentMethodRequest = (silentMethodInstance: SilentMethod, retryTimes = 0) => {
    const {
      cache,
      id,
      behavior,
      entity,
      retryError = 0,
      maxRetryTimes = 0,
      backoff = { delay: 1000 },
      resolveHandler = noop,
      rejectHandler = noop,
      fallbackHandlers = [],
      retryHandlers = [],
      handlerArgs = [],
      virtualResponse,
      previousVTagResponse = {}
    } = silentMethodInstance;

    promiseThen(
      entity.send(),
      data => {
        // 请求成功，移除成功的silentMethod实力，并继续下一个请求
        shift(queue);
        cache && removeSilentMethod(id, queueName);
        // 如果有resolveHandler则调用它通知外部
        resolveHandler(data);

        // 有virtualResponse时才遍历替换虚拟标签，且触发全局事件
        // 一般为silent behavior，而queue behavior不需要
        if (behavior === behaviorSilent) {
          // 替换队列中后面方法实例中的虚拟标签为真实数据
          // 开锁后才能正常访问virtualResponse的层级结构
          globalVirtualResponseLock.v = 1;
          const virtualTagReplacedResponseMap = replaceVirtualResponseWithResponse(virtualResponse, data);
          globalVirtualResponseLock.v = 2;

          // 包含当前silentMethod实例和本队列已完成实例的所有的映射集合
          const allVirtualTagReplacedResponseMap = {
            ...virtualTagReplacedResponseMap,
            ...previousVTagResponse
          };

          const { targetRefMethod, updateStates } = silentMethodInstance; // 实时获取才准确
          // 如果此silentMethod带有targetRefMethod，则再次调用updateState更新数据
          // 此为延迟数据更新的实现
          if (instanceOf(targetRefMethod, Method) && updateStates && len(updateStates) > 0) {
            const updateStateCollection: UpdateStateCollection<any> = {};
            forEach(updateStates, stateName => {
              // 请求成功后，将带有虚拟标签的数据替换为实际数据
              updateStateCollection[stateName] = dataRaw => deepReplaceVTag(dataRaw, allVirtualTagReplacedResponseMap);
            });
            updateState(targetRefMethod, updateStateCollection);
          }

          // 触发全局的成功事件和完成事件
          const createGlobalSuccessEvent = () =>
            createSQEvent(
              0,
              behavior,
              entity,
              silentMethodInstance,
              retryTimes,
              undefinedValue,
              undefinedValue,
              data,
              virtualTagReplacedResponseMap
            );
          runArgsHandler(successHandlers, createGlobalSuccessEvent());
          runArgsHandler(completeHandlers, createGlobalSuccessEvent());

          // 对当前队列的下一个silentMethod实例重新生成method实例
          // 内部是异步替换的，不影响正常流程
          const nextSilentMethod = queue[0];
          if (nextSilentMethod) {
            const regeneratePromise = regenerateMethodEntity(allVirtualTagReplacedResponseMap, nextSilentMethod);
            // 把已完成的所有映射集合继承给下一个silentMethod实例
            nextSilentMethod.previousVTagResponse = allVirtualTagReplacedResponseMap;
            promiseThen(regeneratePromise, () => {
              // method实例重新生成完成后，异步继续下一个silentMethod的处理
              silentMethodRequest(nextSilentMethod);
            });
          }
        }
      },

      // 请求失败回调
      reason => {
        if (behavior !== behaviorSilent) {
          // 当behavior不为silent时，请求失败就触发rejectHandler
          // 且在队列中移除，并不再重试
          shift(queue);
          rejectHandler(reason);
          return;
        }

        // 在silent行为模式下，判断是否需要重试
        // 重试只有在响应错误符合retryError正则匹配时有效
        const { name: errorName = '', message: errorMsg = '' } = reason || {};
        let regRetryErrorName: RegExp | void, regRetryErrorMsg: RegExp | void;
        if (instanceOf(retryError, RegExp)) {
          regRetryErrorMsg = retryError;
        } else if (isObject(retryError)) {
          regRetryErrorName = (retryError as RetryErrorDetailed).name;
          regRetryErrorMsg = (retryError as RetryErrorDetailed).message;
        }

        const matchRetryError =
          (regRetryErrorName && regRetryErrorName.test(errorName)) ||
          (regRetryErrorMsg && regRetryErrorMsg.test(errorMsg));
        // 如果还有重试次数则进行重试
        if (retryTimes < maxRetryTimes && matchRetryError) {
          let { delay, multiplier = 1, startQuiver, endQuiver } = backoff;
          let retryDelayFinally = delay * Math.pow(multiplier, retryTimes);
          // 如果startQuiver或endQuiver有值，则需要增加指定范围的随机抖动值
          if (startQuiver || endQuiver) {
            startQuiver = startQuiver || 0;
            endQuiver = endQuiver || 1;
            retryDelayFinally +=
              retryDelayFinally * startQuiver + Math.random() * retryDelayFinally * (endQuiver - startQuiver);
            retryDelayFinally = Math.floor(retryDelayFinally); // 取整数延迟
          }

          setTimeoutFn(
            () => {
              silentMethodRequest(silentMethodInstance, ++retryTimes);
              runArgsHandler(
                retryHandlers,
                createSQEvent(5, behavior, entity, silentMethodInstance, retryTimes, retryDelayFinally, handlerArgs)
              );
            },
            // 还有重试次数时使用timeout作为下次请求时间，否则是否nextRound
            retryDelayFinally
          );
        } else {
          // 达到失败次数，或不匹配重试的错误信息
          runArgsHandler(
            fallbackHandlers,
            createSQEvent(2, behavior, entity, silentMethodInstance, undefinedValue, undefinedValue, handlerArgs)
          );
          const createGlobalErrorEvent = () =>
            createSQEvent(
              1,
              behavior,
              entity,
              silentMethodInstance,
              retryTimes,
              undefinedValue,
              undefinedValue,
              undefinedValue,
              undefinedValue,
              reason
            );
          runArgsHandler(errorHandlers, createGlobalErrorEvent());
          runArgsHandler(completeHandlers, createGlobalErrorEvent());
        }
      }
    );
  };
  silentMethodRequest(queue[0]);
};

/**
 * 将新的silentMethod实例放入队列中
 * @param methodInstance method实例
 * @param behavior 行为参数
 * @param fallbackHandlers 回退回调函数数组
 * @param retry 重试次数
 * @param timeout 请求超时时间，超时后将重试请求
 * @param nextRound 下一轮请求时间
 * @param resolveHandler promise.resolve函数
 * @param rejectHandler promise.reject函数
 * @param targetQueueName 目标队列名
 */
export const pushNewSilentMethod2Queue = <S, E, R, T, RC, RE, RH>(
  silentMethodInstance: SilentMethod<S, E, R, T, RC, RE, RH>,
  cache: boolean,
  targetQueueName = defaultQueueName,
  onBeforePush = noop
) => {
  silentMethodInstance.cache = cache;
  const currentQueue = (silentQueueMap[targetQueueName] = silentQueueMap[targetQueueName] || []);
  const isNewQueue = len(currentQueue) <= 0;

  onBeforePush();
  // silent行为下，如果没有绑定fallback事件回调，则持久化
  cache && push2PersistentSilentQueue(silentMethodInstance, targetQueueName);
  pushItem(currentQueue, silentMethodInstance);

  // 如果是新的队列且状态为已启动，则执行它
  isNewQueue && silentFactoryStatus === 1 && bootSilentQueue(currentQueue, targetQueueName);
};
