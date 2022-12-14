import {
  AlovaMethodHandler,
  CompleteHandler,
  ErrorHandler,
  Method,
  Progress,
  SuccessHandler,
  updateState
} from 'alova';
import { ComputedRef, Ref, WatchSource } from 'vue';
import {
  BeforeSilentSubmitHandler,
  IsUnknown,
  OffEventCallback,
  PaginationConfig,
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

interface UsePaginationReturnType<S, E, R, T, RC, RE, RH, LD> {
  loading: Ref<boolean>;
  error: Ref<Error | undefined>;
  downloading: Ref<Progress>;
  uploading: Ref<Progress>;
  page: Ref<number>;
  pageSize: Ref<number>;
  data: Ref<
    IsUnknown<
      LD,
      R extends {
        data: any;
      }
        ? R['data']
        : R,
      LD
    >
  >;
  pageCount: ComputedRef<number | undefined>;
  total: ComputedRef<number | undefined>;
  isLastPage: ComputedRef<boolean>;

  abort: () => void;
  send: (...args: any[]) => Promise<R>;
  onSuccess: (handler: SuccessHandler<S, E, R, T, RC, RE, RH>) => void;
  onError: (handler: ErrorHandler<S, E, R, T, RC, RE, RH>) => void;
  onComplete: (handler: CompleteHandler<S, E, R, T, RC, RE, RH>) => void;

  fetching: Ref<boolean>;
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
 * 基于alova.js的vue分页hook
 * 分页相关状态自动管理、前后一页预加载、自动维护数据的新增/编辑/移除
 *
 * @param handler method创建函数
 * @param config pagination hook配置
 * @returns {UsePaginationReturnType}
 */
declare function usePagination<S extends Ref, E extends Ref, R, T, RC, RE, RH, LD, WS extends WatchSource[]>(
  handler: (page: number, pageSize: number) => Method<S, E, R, T, RC, RE, RH>,
  config?: PaginationConfig<R, LD, WS>
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
declare function filterSilentMethods(methodNameMatcher?: string | RegExp, queueName?: string): SilentMethod[];
declare function getSilentMethod(methodNameMatcher?: string | RegExp, queueName?: string): SilentMethod | undefined;
declare const updateStateEffect: typeof updateState;
declare const silentQueueMap: SilentQueueMap;
