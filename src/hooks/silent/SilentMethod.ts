import { Method } from 'alova';
import {
  FallbackHandler,
  RetryHandler,
  SilentMethod as SilentMethodInterface,
  SQHookBehavior
} from '../../../typings/general';
import { splice, uuid } from '../../helper';
import { silentQueueMap } from './silentQueue';
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
   * methodHandler的调用参数
   * 如果其中有虚拟数据也将在请求被响应后被实际数据替换
   */
  public handlerArgs?: any[];

  /** method创建时所使用的虚拟数据id */
  public vDatas?: string[];

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

  /** 当前是否正在请求中 */
  public active?: boolean;
  constructor(
    entity: Method<S, E, R, T, RC, RE, RH>,
    behavior: SQHookBehavior,
    id = uuid(),
    retryError?: RetryError,
    maxRetryTimes?: MaxRetryTimes,
    backoff?: BackoffPolicy,
    fallbackHandlers?: FallbackHandler<S, E, R, T, RC, RE, RH>[],
    resolveHandler?: PromiseExecuteParameter['0'],
    rejectHandler?: PromiseExecuteParameter['1'],
    handlerArgs?: any[],
    vDatas?: string[],
    retryHandlers?: RetryHandler<S, E, R, T, RC, RE, RH>[]
  ) {
    const thisObj = this;
    thisObj.entity = entity;
    thisObj.behavior = behavior;
    thisObj.id = id;
    thisObj.retryError = retryError;
    thisObj.maxRetryTimes = maxRetryTimes;
    thisObj.backoff = backoff;
    thisObj.fallbackHandlers = fallbackHandlers;
    thisObj.resolveHandler = resolveHandler;
    thisObj.rejectHandler = rejectHandler;
    thisObj.handlerArgs = handlerArgs;
    thisObj.vDatas = vDatas;
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
export type SerializedSilentMethod = SilentMethodInterface & {
  entity: MethodEntityPayload;
  targetRefMethod?: MethodEntityPayload;
};
