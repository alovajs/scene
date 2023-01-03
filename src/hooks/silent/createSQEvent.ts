import { Method } from 'alova';
import { SilentMethod, SQHookBehavior } from '../../../typings';
import { defineProperty } from '../../helper';
import { symbolToStringTag } from '../../helper/variables';

/**
 * 创建统一的事件对象，它将承载以下事件
 * 全局的：
 * 	[GlobalSQSuccessEvent]成功：behavior、silentMethod实例、method实例、retryTimes、响应数据、虚拟数据和实际值的集合
 * 	[GlobalSQErrorEvent]失败：behavior、silentMethod实例、method实例、retryTimes、错误对象
 * 	[GlobalSQSuccessEvent | GlobalSQErrorEvent]完成事件：behavior、silentMethod实例、method实例、* retryTimes、[?]响应数据、[?]错误对象
 *
 * 局部的：
 * 	[ScopedSQSuccessEvent]成功：behavior、silentMethod实例、method实例、retryTimes、send参数、响应数据
 * 	[ScopedSQErrorEvent]失败：behavior、silentMethod实例、method实例、retryTimes、send参数、错误对象
 * 	[ScopedSQErrorEvent]回退：behavior、silentMethod实例、method实例、retryTimes、send参数、错误对象
 * 	[ScopedSQSuccessEvent | ScopedSQErrorEvent]完成事件：behavior、silentMethod实例、method实例、retryTimes、send参数、[?]错误对象
 *  [ScopedSQRetryEvent]重试：behavior、silentMethod实例、method实例、send参数、retryTimes、retryDelay
 * 	[ScopedSQEvent]入队列前：behavior、silentMethod实例、method实例、send参数
 * 	[ScopedSQEvent]入队列后：behavior、silentMethod实例、method实例、send参数
 *
 */
export default <S, E, R, T, RC, RE, RH>(
  eventType: number,
  behavior: SQHookBehavior,
  method: Method<S, E, R, T, RC, RE, RH>,
  silentMethod?: SilentMethod<S, E, R, T, RC, RE, RH>,
  retryTimes?: number,
  retryDelay?: number,
  sendArgs?: any[],
  data?: R,
  vDataResponse?: Record<string, any>,
  error?: any
) => {
  const sqEvent: any = {};

  /** 事件对应的请求行为 */
  behavior && (sqEvent.behavior = behavior);

  /** 当前的method实例 */
  method && (sqEvent.method = method);

  /** 当前的silentMethod实例，当behavior为static时没有值 */
  silentMethod && (sqEvent.silentMethod = silentMethod);

  /** 已重试的次数，在beforePush和pushed事件中没有值 */
  retryTimes && (sqEvent.retryTimes = retryTimes);

  /** 重试的延迟时间 */
  retryDelay && (sqEvent.retryDelay = retryDelay);

  /** 通过send触发请求时传入的参数 */
  sendArgs && (sqEvent.sendArgs = sendArgs);

  /** 响应数据，只在成功时有值 */
  data && (sqEvent.data = data);

  /** 虚拟数据和实际值的集合 */
  vDataResponse && (sqEvent.vDataResponse = vDataResponse);

  /** 失败时抛出的错误，只在失败时有值 */
  error && (sqEvent.error = error);

  // 将此类的对象重新命名，让它看上去是由不同的类生成的对象
  // 以此来对应typescript中定义的类型
  const typeName = [
    'GlobalSQSuccessEvent',
    'GlobalSQErrorEvent',
    'ScopedSQEvent',
    'ScopedSQSuccessEvent',
    'ScopedSQErrorEvent',
    'ScopedSQRetryEvent'
  ][eventType];
  typeName && defineProperty(sqEvent, symbolToStringTag, typeName);
  return sqEvent;
};
