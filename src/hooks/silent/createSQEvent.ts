import { Method } from 'alova';
import { SilentMethod, SQHookBehavior } from '../../../typings';
import { defineProperties } from '../../helper';

/**
 * 创建统一的事件对象，它将承载以下事件
 * 全局的：
 * 	[GlobalSQSuccessEvent]成功：behavior、silentMethod实例、method实例、retryTimes、响应数据、虚拟标签和实际值的集合
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
  vtagResponse?: Record<string, any>,
  error?: any
) => {
  const sqEvent = {
    /** 事件对应的请求行为 */
    behavior,

    /** 当前的method实例 */
    method,

    /** 当前的silentMethod实例，当behavior为static时没有值 */
    silentMethod,

    /** 已重试的次数，在beforePush和pushed事件中没有值 */
    retryTimes,

    /** 重试的延迟时间 */
    retryDelay,

    /** 通过send触发请求时传入的参数 */
    sendArgs,

    /** 响应数据，只在成功时有值 */
    data,

    /** 虚拟标签和实际值的集合 */
    vtagResponse,

    /** 失败时抛出的错误，只在失败时有值 */
    error
  };

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
  typeName &&
    defineProperties(sqEvent, {
      [Symbol.toStringTag]: typeName
    });
  return sqEvent;
};
