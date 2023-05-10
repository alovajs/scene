import {
  AlovaMethodHandler,
  CompleteHandler,
  ErrorHandler,
  Method,
  Progress,
  SuccessHandler,
  updateState
} from 'alova';
import { DependencyList, Dispatch, SetStateAction } from 'react';
import {
  BeforeSilentSubmitHandler,
  CaptchaHookConfig,
  CaptchaReturnType,
  FormHookConfig,
  FormReturnType,
  IsUnknown,
  OffEventCallback,
  PaginationHookConfig,
  RetriableHookConfig,
  RetriableReturnType,
  SilentFactoryBootOptions,
  SilentMethod,
  SilentQueueMap,
  SilentSubmitBootHandler,
  SilentSubmitErrorHandler,
  SilentSubmitFailHandler,
  SilentSubmitSuccessHandler,
  SQHookReturnType,
  SQRequestHookConfig
} from './general';

type ReactState<S> = [S, Dispatch<SetStateAction<S>>];

interface UsePaginationReturnType<S, E, R, T, RC, RE, RH, LD> {
  loading: boolean;
  error: Error | undefined;
  downloading: Progress;
  uploading: Progress;
  page: ReactState<number>;
  pageSize: ReactState<number>;
  data: IsUnknown<
    LD,
    R extends {
      data: any;
    }
      ? R['data']
      : R,
    LD
  >;
  pageCount: number | undefined;
  total: number | undefined;
  isLastPage: boolean;

  abort: () => void;
  send: (...args: any[]) => Promise<R>;
  onSuccess: (handler: SuccessHandler<S, E, R, T, RC, RE, RH>) => void;
  onError: (handler: ErrorHandler<S, E, R, T, RC, RE, RH>) => void;
  onComplete: (handler: CompleteHandler<S, E, R, T, RC, RE, RH>) => void;

  fetching: boolean;
  onFetchSuccess: (handler: SuccessHandler<S, E, R, T, RC, RE, RH>) => void;
  onFetchError: (handler: ErrorHandler<S, E, R, T, RC, RE, RH>) => void;
  onFetchComplete: (handler: CompleteHandler<S, E, R, T, RC, RE, RH>) => void;

  /**
   * 刷新指定页码数据，此函数将忽略缓存强制发送请求
   * @param refreshPage 刷新的页码
   */
  refresh: (refreshPage: number) => void;

  /**
   * 插入一条数据，未传入index时默认插入到最前面
   * @param item 插入项
   * @param index 插入位置（索引）
   */
  insert: (item: LD extends any[] ? LD[number] : any, index?: number) => void;

  /**
   * 移除一条数据
   * @param index 移除的索引
   */
  remove: (index: number) => void;

  /**
   * 替换一条数据
   * @param item 替换项
   * @param index 替换位置（索引）
   */
  replace: (item: LD extends any[] ? LD[number] : any, index: number) => void;

  /**
   * 从第一页开始重新加载列表，并清空缓存
   */
  reload: () => void;
}

/**
 * 基于alova.js的react分页hook
 * 分页相关状态自动管理、前后一页预加载、自动维护数据的新增/编辑/移除
 *
 * @param handler method创建函数
 * @param config pagination hook配置
 * @returns {UsePaginationReturnType}
 */
declare function usePagination<S, E, R, T, RC, RE, RH, LD, WS extends DependencyList>(
  handler: (page: number, pageSize: number) => Method<S, E, R, T, RC, RE, RH>,
  config?: PaginationHookConfig<R, LD, WS>
): UsePaginationReturnType<S, E, R, T, RC, RE, RH, LD>;

/**
 * 带silentQueue的request hook
 * silentQueue是实现静默提交的核心部件，其中将用于存储silentMethod实例，它们将按顺序串行发送提交
 */
declare function useSQRequest<S, E, R, T, RC, RE, RH>(
  handler: AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
  config?: SQRequestHookConfig<S, E, R, T, RC, RE, RH>
): SQHookReturnType<S, E, R, T, RC, RE, RH>;
declare function bootSilentFactory(options: SilentFactoryBootOptions): void;
declare function onSilentSubmitBoot(handler: SilentSubmitBootHandler): OffEventCallback;
declare function onSilentSubmitSuccess(handler: SilentSubmitSuccessHandler): OffEventCallback;
declare function onSilentSubmitError(handler: SilentSubmitErrorHandler): OffEventCallback;
declare function onSilentSubmitFail(handler: SilentSubmitFailHandler): OffEventCallback;
declare function onBeforeSilentSubmit(handler: BeforeSilentSubmitHandler): OffEventCallback;
declare function dehydrateVData<T>(target: T): T;
declare function stringifyVData(target: any, returnOriginalIfNotVData?: boolean): any;
declare function isVData(target: any): boolean;
declare function equals(prevValue: any, nextValue: any): boolean;
declare function filterSilentMethods(
  methodNameMatcher?: string | number | RegExp,
  queueName?: string,
  filterActive?: boolean
): SilentMethod[];
declare function getSilentMethod(
  methodNameMatcher?: string | number | RegExp,
  queueName?: string,
  filterActive?: boolean
): SilentMethod | undefined;
declare const updateStateEffect: typeof updateState;
declare const silentQueueMap: SilentQueueMap;

/**
 * 验证码发送场景的请求hook
 * @param handler method实例或获取函数
 * @param 配置参数
 * @return useCaptcha相关数据和操作函数
 */
declare function useCaptcha<S, E, R, T, RC, RE, RH>(
  handler: Method<S, E, R, T, RC, RE, RH> | AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
  config?: CaptchaHookConfig<S, E, R, T, RC, RE, RH>
): CaptchaReturnType<S, E, R, T, RC, RE, RH>;

/**
 * useForm
 * 表单的提交hook，具有草稿功能，以及多页表单的数据同步功能
 *
 * 适用场景：
 * 1. 单表单/多表单提交、草稿数据持久化、数据更新和重置
 * 2. 条件搜索输入项，可持久化搜索条件，可立即发送表单数据
 *
 * @param handler method获取函数，只需要获取同步数据时可传id
 * @param config 配置参数
 * @return useForm相关数据和操作函数
 */
declare function useForm<S, E, R, T, RC, RE, RH, F = any>(
  handler: FormHookHandler<S, E, R, T, RC, RE, RH, F> | NonNullable<FormHookConfig<S, E, R, T, RC, RE, RH, F>['id']>,
  config?: FormHookConfig<S, E, R, T, RC, RE, RH, F>
): FormReturnType<S, E, R, T, RC, RE, RH, F>;

/**
 * useRetriableRequest
 * 具有重试功能的请求hook
 * 适用场景：
 * 1. 请求失败重试、或自定义规则重试
 * 2. 手动停止/启动重试
 *
 * @param handler method实例或获取函数
 * @param config 配置参数
 * @return useRetriableRequest相关数据和操作函数
 */
declare function useRetriableRequest<S, E, R, T, RC, RE, RH>(
  handler: Method<S, E, R, T, RC, RE, RH> | AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
  config?: RetriableHookConfig<S, E, R, T, RC, RE, RH>
): RetriableReturnType<S, E, R, T, RC, RE, RH>;
