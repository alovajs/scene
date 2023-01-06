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
  BootSilentFactoryFunction,
  DehydrateVDataFunction,
  FilterSilentMethodsFunction,
  GetSilentMethodFunction,
  IsUnknown,
  OnSilentSubmitBootFunction,
  OnSilentSubmitCompleteFunction,
  OnSilentSubmitErrorFunction,
  OnSilentSubmitSuccessFunction,
  PaginationConfig,
  SilentQueueMap,
  SQHookReturnType,
  SQRequestHookConfig,
  StringifyVDataFunction
} from './general';

type ReactState<S> = [S, Dispatch<SetStateAction<S>>];

interface UsePaginationReturnType<LD, R> {
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
  onSuccess: (handler: SuccessHandler<R>) => void;
  onError: (handler: ErrorHandler) => void;
  onComplete: (handler: CompleteHandler) => void;

  fetching: boolean;
  onFetchSuccess: (handler: SuccessHandler<R>) => void;
  onFetchError: (handler: ErrorHandler) => void;
  onFetchComplete: (handler: CompleteHandler) => void;

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
export declare function usePagination<S, E, R, T, RC, RE, RH, LD, WS extends DependencyList>(
  handler: (page: number, pageSize: number) => Method<S, E, R, T, RC, RE, RH>,
  config?: PaginationConfig<R, LD, WS>
): UsePaginationReturnType<LD, R>;

/**
 * 带silentQueue的request hook
 * silentQueue是实现静默提交的核心部件，其中将用于存储silentMethod实例，它们将按顺序串行发送提交
 */
export declare function useSQRequest<S, E, R, T, RC, RE, RH>(
  handler: AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
  config?: SQRequestHookConfig<S, E, R, T, RC, RE, RH>
): SQHookReturnType<S, E, R, T, RC, RE, RH>;
declare const bootSilentFactory: BootSilentFactoryFunction;
declare const onSilentSubmitBoot: OnSilentSubmitBootFunction;
declare const onSilentSubmitSuccess: OnSilentSubmitSuccessFunction;
declare const onSilentSubmitError: OnSilentSubmitErrorFunction;
declare const onSilentSubmitComplete: OnSilentSubmitCompleteFunction;
declare const dehydrateVData: DehydrateVDataFunction;
declare const stringifyVData: StringifyVDataFunction;
declare const filterSilentMethods: FilterSilentMethodsFunction;
declare const getSilentMethod: GetSilentMethodFunction;
declare const updateStateEffect: typeof updateState;
declare const silentQueueMap: SilentQueueMap;
