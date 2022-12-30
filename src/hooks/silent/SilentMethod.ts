import { Method } from 'alova';
import { FallbackHandler, RetryHandler, SilentMethod as SilentMethodInterface, SQHookBehavior } from '../../../typings';
import {
  newInstance,
  objectKeys,
  objectValues,
  parseFunctionBody,
  parseFunctionParams,
  splice,
  uuid
} from '../../helper';
import { silentQueueMap } from './silentQueue';
import deserialize from './storage/deserialize';
import serialize from './storage/serialize';
import { persistSilentMethod, removeSilentMethod } from './storage/silentMethodStorage';

export type PromiseExecuteParameter = Parameters<ConstructorParameters<typeof Promise<any>>['0']>;
export type MethodHandler<S, E, R, T, RC, RE, RH> = (...args: any[]) => Method<S, E, R, T, RC, RE, RH>;
export type BackoffPolicy = NonNullable<SilentMethodInterface['backoff']>;
export type MaxRetryTimes = NonNullable<SilentMethodInterface['maxRetryTimes']>;
export type RetryError = NonNullable<SilentMethodInterface['retryError']>;

export class SilentMethod<S = any, E = any, R = any, T = any, RC = any, RE = any, RH = any> {
  public id: string;
  /** 是否为持久化实例 */
  public cache: boolean;
  /** 实例的行为，queue或silent */
  public behavior: SQHookBehavior;
  /** method实例 */
  public entity: Method<S, E, R, T, RC, RE, RH>;

  /**
   * method实例生成函数，由虚拟标签内的Symbol.toPrimitive函数保存至此
   * 当虚拟响应数据被替换为实际响应数据时，将调用此函数重新创建method，达到替换虚拟标签的目的
   */
  public methodHandler: MethodHandler<S, E, R, T, RC, RE, RH>;

  /** 重试错误规则 */
  public retryError?: RetryError;
  /** 重试次数 */
  public maxRetryTimes?: MaxRetryTimes;
  /** 避让策略 */
  public backoff?: BackoffPolicy;

  /** 回退事件回调，当重试次数达到上限但仍然失败时，此回调将被调用 */
  public fallbackHandlers?: FallbackHandler<S, E, R, T, RC, RE, RH>[];

  /** Promise的resolve函数，调用将通过对应的promise对象 */
  public resolveHandler?: PromiseExecuteParameter['0'];

  /** Promise的reject函数，调用将失败对应的promise对象 */
  public rejectHandler?: PromiseExecuteParameter['1'];

  /** 虚拟响应数据，通过updateStateEffect保存到此 */
  public virtualResponse?: any;

  /**
   * 虚拟标签和真实数据的映射集合
   * 它包含当前队列内已完成的silentMethod实例的所有vtagResponse集合
   */
  public previousVTagResponse?: Record<string, any>;

  /**
   * methodHandler的调用参数
   * 如果其中有虚拟标签也将在请求被响应后被实际数据替换
   */
  public handlerArgs: any[];

  /** method创建时所使用的虚拟标签id */
  public vTags?: string[];

  /**
   * 状态更新所指向的method实例
   * 当调用updateStateEffect时将会更新状态的目标method实例保存在此
   * 目的是为了让刷新页面后，提交数据也还能找到需要更新的状态
   */
  public targetRefMethod?: Method;

  /** 调用updateStateEffect更新了哪些状态 */
  public updateStates?: string[];

  /** 重试回调函数 */
  public retryHandlers?: RetryHandler<S, E, R, T, RC, RE, RH>[];
  constructor(
    entity: Method<S, E, R, T, RC, RE, RH>,
    behavior: SQHookBehavior,
    methodHandler: MethodHandler<S, E, R, T, RC, RE, RH> | string,
    id = uuid(),
    retryError?: RetryError,
    maxRetryTimes?: MaxRetryTimes,
    backoff?: BackoffPolicy,
    fallbackHandlers?: FallbackHandler<S, E, R, T, RC, RE, RH>[],
    resolveHandler?: PromiseExecuteParameter['0'],
    rejectHandler?: PromiseExecuteParameter['1'],
    handlerArgs?: any[],
    closureScope: Record<string | number, any> = {},
    vTag?: string[],
    retryHandlers?: RetryHandler<S, E, R, T, RC, RE, RH>[]
  ) {
    const thisObj = this;

    // 将closureScope深拷贝一份，以免在后续调用handlerMethod时因外部作用域的值变化而导致不一致的问题
    // 通过序列化和反序列化的形式进行深拷贝
    // 同时还能使用到序列化器
    closureScope = deserialize(serialize(closureScope));

    // 将methodHandler解析为统一的函数
    const fnParams = parseFunctionParams(methodHandler);
    const fnBody = parseFunctionBody(methodHandler);
    methodHandler = newInstance(Function, ...fnParams, ...objectKeys(closureScope), fnBody) as MethodHandler<
      S,
      E,
      R,
      T,
      RC,
      RE,
      RH
    >;

    thisObj.entity = entity;
    thisObj.behavior = behavior;
    thisObj.methodHandler = methodHandler;
    thisObj.id = id;
    thisObj.retryError = retryError;
    thisObj.maxRetryTimes = maxRetryTimes;
    thisObj.backoff = backoff;
    thisObj.fallbackHandlers = fallbackHandlers;
    thisObj.resolveHandler = resolveHandler;
    thisObj.rejectHandler = rejectHandler;
    thisObj.handlerArgs = [...(handlerArgs || []), ...objectValues(closureScope)];
    thisObj.vTags = vTag;
    thisObj.retryHandlers = retryHandlers;
  }

  /**
   * 允许缓存时持久化更新当前实例
   */
  public save() {
    this.cache && persistSilentMethod(this);
  }

  /**
   * 移除当前实例，它将在持久化存储中同步移除
   */
  public remove() {
    for (const queueName in silentQueueMap) {
      const index = silentQueueMap[queueName].indexOf(this);
      if (index >= 0) {
        const targetSilentMethod = silentQueueMap[queueName][index];
        splice(silentQueueMap[queueName], index, 1);
        this.cache && targetSilentMethod && removeSilentMethod(targetSilentMethod.id, queueName);
        break;
      }
    }
  }
}

type MethodEntityPayload = Omit<Method<any, any, any, any, any, any, any>, 'context' | 'response' | 'send'>;
export type SerializedSilentMethod = Omit<SilentMethodInterface, 'methodHandler'> & {
  entity: MethodEntityPayload;
  targetRefMethod?: MethodEntityPayload;
  methodHandler: string;
};
