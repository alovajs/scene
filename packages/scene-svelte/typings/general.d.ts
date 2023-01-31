import { Alova, AlovaCompleteEvent, Method, RequestHookConfig, UseHookReturnType, WatcherHookConfig } from 'alova';

/** 判断是否为any */
type IsAny<T, P, N> = 0 extends 1 & T ? P : N;

/** 判断是否为unknown */
type IsUnknown<T, P, N> = 1 extends 1 & T ? P : N;

/** @description usePagination相关 */
type ArgGetter<R, LD> = (data: R) => LD | undefined;
interface PaginationConfig<R, LD, WS> {
  preloadPreviousPage?: boolean;
  preloadNextPage?: boolean;
  pageCount?: ArgGetter<R, number>;
  total?: ArgGetter<R, number>;
  data?: ArgGetter<R, LD>;
  initialData?: WatcherHookConfig<any, any, any, any, any, any, any>['initialData'];
  append?: boolean;
  initialPage?: number;
  initialPageSize?: number;
  debounce?: WatcherHookConfig<any, any, any, any, any, any, any>['debounce'];
  watchingStates?: WS;
}

// =========================
/** 静默提交事件 */
// 事件：
// 全局的：
//  [GlobalSQEvent]请求事件：behavior、silentMethod实例、method实例、retryTimes
//  [GlobalSQSuccessEvent]成功：behavior、silentMethod实例、method实例、retryTimes、响应数据、虚拟数据和实际值的集合
//  [GlobalSQErrorEvent]错误：behavior、silentMethod实例、method实例、retryTimes、错误对象、[?]下次重试间隔时间
//  [GlobalSQFailEvent]失败事件：behavior、silentMethod实例、method实例、retryTimes、错误对象

// 局部的：
//  [ScopedSQSuccessEvent]成功：behavior、silentMethod实例、method实例、retryTimes、send参数、响应数据
//  [ScopedSQErrorEvent]失败：behavior、silentMethod实例、method实例、retryTimes、send参数、错误对象
//  [ScopedSQErrorEvent]回退：behavior、silentMethod实例、method实例、retryTimes、send参数、错误对象
//  [ScopedSQSuccessEvent | ScopedSQErrorEvent]完成事件：behavior、silentMethod实例、method实例、retryTimes、send参数、[?]错误对象
//  [ScopedSQEvent]入队列前：behavior、silentMethod实例、method实例、send参数
//  [ScopedSQEvent]入队列后：behavior、silentMethod实例、method实例、send参数
/** 顶层事件 */
interface SQEvent<S, E, R, T, RC, RE, RH> {
  /** 事件对应的请求行为 */
  behavior: SQHookBehavior;
  /** 当前的method实例 */
  method: Method<S, E, R, T, RC, RE, RH>;
  /** 当前的silentMethod实例，当behavior为static时没有值 */
  silentMethod?: SilentMethod<S, E, R, T, RC, RE, RH>;
}
/** 全局事件 */
interface GlobalSQEvent extends SQEvent<any, any, any, any, any, any, any> {
  /** 重试次数，在beforePush和pushed事件中没有值 */
  retryTimes: number;

  /** silentMethod所在的队列名 */
  queueName: string;
}
/** 全局成功事件 */
interface GlobalSQSuccessEvent extends GlobalSQEvent {
  /** 响应数据 */
  data: any;
  /**
   * 虚拟数据和实际值的集合
   * 里面只包含你已用到的虚拟数据的实际值
   */
  vDataResponse: Record<string, any>;
}
/** 全局失败事件 */
interface GlobalSQErrorEvent extends GlobalSQEvent {
  /** 失败时抛出的错误 */
  error: any;

  /** 下次重试间隔时间（毫秒） */
  retryDelay?: number;
}
/** 全局失败事件 */
interface GlobalSQFailEvent extends GlobalSQEvent {
  /** 失败时抛出的错误 */
  error: any;
}

/** 局部事件 */
interface ScopedSQEvent<S, E, R, T, RC, RE, RH> extends SQEvent<S, E, R, T, RC, RE, RH> {
  /** 通过send触发请求时传入的参数 */
  sendArgs: any[];
}
/** 局部成功事件 */
interface ScopedSQSuccessEvent<S, E, R, T, RC, RE, RH> extends ScopedSQEvent<S, E, R, T, RC, RE, RH> {
  /** 响应数据 */
  data: any;
}
/** 局部失败事件 */
interface ScopedSQErrorEvent<S, E, R, T, RC, RE, RH> extends ScopedSQEvent<S, E, R, T, RC, RE, RH> {
  /** 失败时抛出的错误 */
  error: any;
}
/** 局部失败事件 */
interface ScopedSQRetryEvent<S, E, R, T, RC, RE, RH> extends ScopedSQEvent<S, E, R, T, RC, RE, RH> {
  retryTimes: number;
  retryDelay: number;
}
/** 局部完成事件 */
interface ScopedSQCompleteEvent<S, E, R, T, RC, RE, RH> extends ScopedSQEvent<S, E, R, T, RC, RE, RH> {
  /** 响应状态 */
  status: AlovaCompleteEvent<S, E, R, T, RC, RE, RH>['status'];
  /** 响应数据 */
  data?: R;
  /** 失败时抛出的错误 */
  error?: any;
}

interface RetryErrorDetailed {
  name?: RegExp;
  message?: RegExp;
}

/**
 * silentMethod实例
 * 需要进入silentQueue的请求都将被包装成silentMethod实例，它将带有请求策略的各项参数
 */
interface SilentMethod<S = any, E = any, R = any, T = any, RC = any, RE = any, RH = any> {
  /** silentMethod实例id */
  readonly id: string;
  /** 是否为持久化实例 */
  readonly cache: boolean;
  /** 实例的行为，queue或silent */
  readonly behavior: SQHookBehavior;
  /** method实例 */
  readonly entity: Method<S, E, R, T, RC, RE, RH>;

  /** 重试错误规则
   * 当错误符合以下表达式时才进行重试
   * 当值为正则表达式时，它将匹配错误对象的message
   * 当值为对象时，可设定匹配的是错误对象的name、或者message，如果两者都有设定，将以或的形式匹配
   *
   * 未设置时，默认所有错误都进行重试
   */
  readonly retryError?: RegExp | RetryErrorDetailed;
  /** 重试次数 */
  readonly maxRetryTimes?: number;
  /** 避让策略 */
  readonly backoff?: {
    /** 再次请求的延迟时间，单位毫秒，默认为1000 */
    delay?: number;
    /** 指定延迟倍数，例如把multiplier设置为1.5，delay为2秒，则第一次重试为2秒，第二次为3秒，第三次为4.5秒，默认为0 */
    multiplier?: number;

    /**
     * 延迟请求的抖动起始百分比值，范围为0-1
     * 当只设置了startQuiver时，endQuiver默认为1
     * 例如设置为0.5，它将在当前延迟时间上增加50%到100%的随机时间
     * 如果endQuiver有值，则延迟时间将增加startQuiver和endQuiver范围的随机值
     */
    startQuiver?: number;

    /**
     * 延迟请求的抖动结束百分比值，范围为0-1
     * 当只设置了endQuiver时，startQuiver默认为0
     * 例如设置为0.5，它将在当前延迟时间上增加0%到50%的随机时间
     * 如果startQuiver有值，则延迟时间将增加startQuiver和endQuiver范围的随机值
     */
    endQuiver?: number;
  };

  /** 回退事件回调，当重试次数达到上限但仍然失败时，此回调将被调用 */
  readonly fallbackHandlers?: FallbackHandler<S, E, R, T, RC, RE, RH>[];

  /** Promise的resolve函数，调用将通过对应的promise对象 */
  readonly resolveHandler?: Parameters<ConstructorParameters<typeof Promise<any>>['0']>['0'];

  /** Promise的reject函数，调用将失败对应的promise对象 */
  readonly rejectHandler?: Parameters<ConstructorParameters<typeof Promise<any>>['0']>['1'];

  /**
   * methodHandler的调用参数
   * 如果其中有虚拟数据也将在请求被响应后被实际数据替换
   */
  readonly handlerArgs?: any[];

  /** method创建时所使用的虚拟数据id */
  readonly vDatas?: string[];

  /** 虚拟响应数据，通过delayUpdateState保存到此 */
  virtualResponse?: any;

  /** 调用updateStateEffect更新了哪些状态 */
  updateStates?: string[];

  /**
   * 静默提交状态更新数据
   * 当静默提交数据后，我们还需要将提交数据手动更新到其他状态中以达到立即展示提交信息的目的
   * 为了让更新的数据在重新加载页面后还能获取到，我们可以用此字段保存并随着silentMethod一同持久化
   * 你可以在需要使用到这些数据的地方再次获取到并展示到界面上
   *
   * 注意：一般而言，你可以以任意属性名保存持久化数据，但在typescript中会报错，因此为你指定了reviewData作为静默提交状态数据的保存属性
   */
  reviewData?: any;

  /**
   * 静默提交时的额外持久化数据
   * 当静默提交后数据真正提交前，我们可能需要访问这条新数据
   * 当提交的数据不满足界面渲染所需的数据时，我们可以在提交时将额外的数据保存到submitExtra字段中，保证下次可以获取到它
   *
   * 注意：一般而言，你可以以任意属性名保存持久化数据，但在typescript中会报错，因此为你指定了submitExtra作为以上作用的字段
   */
  submitExtra?: any;

  /**
   * 状态更新所指向的method实例
   * 当调用updateStateEffect时将会更新状态的目标method实例保存在此
   * 目的是为了让刷新页面后，提交数据也还能找到需要更新的状态
   */
  targetRefMethod?: Method;

  /** 重试回调函数 */
  retryHandlers?: RetryHandler<S, E, R, T, RC, RE, RH>[];

  /** 当前是否正在请求中 */
  active?: boolean;

  /**
   * 允许缓存时持久化更新当前实例
   */
  save(): void;

  /**
   * 在队列中使用一个新的silentMethod实例替换当前实例
   * 如果有持久化缓存也将会更新缓存
   * @param newSilentMethod 新的silentMethod实例
   */
  replace(newSilentMethod: SilentMethod): void;

  /**
   * 移除当前实例，它将在持久化存储中同步移除
   */
  remove(): void;
}

// 静默队列hooks相关
type SQHookBehavior = 'static' | 'queue' | 'silent';
interface SQHookConfig<S, E, R, T, RC, RE, RH> {
  /**
   * hook行为，可选值为silent、queue、static，默认为queue
   * 可以设置为可选值，或一个带返回可选值的回调函数
   * silent：静默提交，方法实例会进入队列并持久化，然后立即触发onSuccess
   * queue: 队列请求，方法实例会进入队列但不持久化，onSuccess、onError正常触发
   * static：静态请求，和普通的useRequest一样
   *
   * 场景1. 手动开关
   * 场景2. 网络状态不好时回退到static，网络状态自行判断
   */
  behavior?: SQHookBehavior | (() => SQHookBehavior);

  /** 重试错误规则
   * 当错误符合以下表达式时才进行重试
   * 当值为正则表达式时，它将匹配错误对象的message
   * 当值为对象时，可设定匹配的是错误对象的name、或者message，如果两者都有设定，将以或的形式匹配
   */
  retryError?: NonNullable<SilentMethod['retryError']>;

  /** 重试最大次数 */
  maxRetryTimes?: NonNullable<SilentMethod['maxRetryTimes']>;

  /** 避让策略 */
  backoff?: NonNullable<SilentMethod['backoff']>;

  /** 队列名，不传时选择默认队列 */
  queue?: string;

  /** 静默提交时默认的响应数据 */
  silentDefaultResponse?: () => any;

  /**
   * 它将在捕获到method中带有虚拟数据时调用
   * 当此捕获回调返回了数据时将会以此数据作为响应数据处理，而不再发送请求
   * @param {Method} method method实例
   * @returns {R} 与响应数据相同格式的数据
   */
  vDataCaptured?: (method: Method<S, E, R, T, RC, RE, RH>) => R | undefined | void;
}

type SQRequestHookConfig<S, E, R, T, RC, RE, RH> = SQHookConfig<S, E, R, T, RC, RE, RH> &
  Omit<RequestHookConfig<S, E, R, T, RC, RE, RH>, 'middleware'>;
type SQWatcherHookConfig<S, E, R, T, RC, RE, RH> = SQHookConfig<S, E, R, T, RC, RE, RH> &
  Omit<WatcherHookConfig<S, E, R, T, RC, RE, RH>, 'middleware'>;

type FallbackHandler<S, E, R, T, RC, RE, RH> = (event: ScopedSQEvent<S, E, R, T, RC, RE, RH>) => void;
type RetryHandler<S, E, R, T, RC, RE, RH> = (event: ScopedSQRetryEvent<S, E, R, T, RC, RE, RH>) => void;
type BeforePushQueueHandler<S, E, R, T, RC, RE, RH> = (event: ScopedSQEvent<S, E, R, T, RC, RE, RH>) => void;
type PushedQueueHandler<S, E, R, T, RC, RE, RH> = (event: ScopedSQEvent<S, E, R, T, RC, RE, RH>) => void;
type SQHookReturnType<S, E, R, T, RC, RE, RH> = UseHookReturnType<S, E, R, T, RC, RE, RH> & {
  /**
   * 回退事件绑定函数，它将在以下情况触发：
   * 1. 重试指定次数都无响应而停止继续请求后
   * 2. 因断网、服务端相应错误而停止请求后
   *
   * 绑定此事件后，请求持久化将失效，这意味着刷新即丢失静默提交的项
   * 它只在silent行为下有效
   *
   * 和onComplete事件对比：
   * 1. 只在重试次数达到后仍然失败时触发
   * 2. 在onComplete之前触发
   */
  onFallback: (handler: FallbackHandler<S, E, R, T, RC, RE, RH>) => void;

  /** 在入队列前调用，在此可以过滤队列中重复的SilentMethod，在static行为下无效 */
  onBeforePushQueue: (handler: BeforePushQueueHandler<S, E, R, T, RC, RE, RH>) => boolean | void;

  /** 在入队列后调用，在static行为下无效 */
  onPushedQueue: (handler: PushedQueueHandler<S, E, R, T, RC, RE, RH>) => void;

  /** 重试事件绑定 */
  onRetry: (handler: RetryHandler<S, E, R, T, RC, RE, RH>) => void;

  /** @override 重写alova的onSuccess事件 */
  onSuccess: (handler: (event: ScopedSQSuccessEvent<S, E, R, T, RC, RE, RH>) => void) => void;

  /** @override 重写alova的onError事件 */
  onError: (handler: (event: ScopedSQErrorEvent<S, E, R, T, RC, RE, RH>) => void) => void;

  /** @override 重写alova的onComplete事件 */
  onComplete: (handler: (event: ScopedSQCompleteEvent<S, E, R, T, RC, RE, RH>) => void) => void;
};

interface DataSerializer {
  forward: (data: any) => any | undefined | void;
  backward: (data: any) => any | undefined | void;
}

/** SilentFactory启动选项 */
interface SilentFactoryBootOptions {
  /**
   * silentMethod依赖的alova实例
   * alova实例的存储适配器、请求适配器等将用于存取SilentMethod实例，以及发送静默提交
   */
  alova: Alova<any, any, any, any, any>;

  /** 延迟毫秒数，不传时默认延迟2000ms */
  delay?: number;

  /**
   * 序列化器集合，用于自定义转换为序列化时某些不能直接转换的数据
   * 集合的key作为它的名字进行序列化，当反序列化时会将对应名字的值传入backward函数中
   * 因此，在forward中序列化时需判断是否为指定的数据，并返回转换后的数据，否则返回undefined或不返回
   * 而在backward中可通过名字来识别，因此只需直接反序列化即可
   * 内置的序列化器：
   * 1. date序列化器用于转换日期
   * 2. regexp序列化器用于转化正则表达式
   *
   * >>> 可以通过设置同名序列化器来覆盖内置序列化器
   */
  serializers?: Record<string | number, DataSerializer>;

  /**
   * silentQueue内的请求延迟时间，单位为毫秒（ms）
   * 即表示第一个silentMethod，或下一个silentMethod发起请求的延迟时间
   * 如果未设置，或设置为0表示立即触发silentMethod请求
   * 直接设置为数字时对default queue有效
   * 如果需要对其他queue设置可设置为对象，示例：
   * { customName: 5000 } 是对名为customWName的queue设置请求延迟时间
   *
   * >>> 它只在请求成功时起作用，如果失败则会使用重试策略参数
   */
  queueRequestDelay?: number | Record<string, number>;
}

type SilentSubmitBootHandler = () => void;
type BeforeSilentSubmitHandler = (event: GlobalSQEvent) => void;
type SilentSubmitSuccessHandler = (event: GlobalSQSuccessEvent) => void;
type SilentSubmitErrorHandler = (event: GlobalSQErrorEvent) => void;
type SilentSubmitFailHandler = (event: GlobalSQFailEvent) => void;
type OffEventCallback = () => void;
type SilentQueueMap = Record<string, SilentMethod[]>;
