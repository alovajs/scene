import { CacheExpire, LocalCacheConfig, Method } from 'alova';
import { BackoffPolicy } from '~/typings/general';
import { falseValue, nullValue, ObjectCls, PromiseCls, StringCls, trueValue, undefinedValue } from './variables';

export const promiseResolve = <T>(value?: T) => PromiseCls.resolve(value),
  promiseReject = <T>(value: T) => PromiseCls.reject(value),
  promiseThen = <T, T2 = never>(
    promise: Promise<T>,
    onFulfilled?: ((value: T) => T | PromiseLike<T>) | undefined | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | undefined | null
  ): Promise<T | T2> => promise.then(onFulfilled, onrejected),
  promiseCatch = <T, O>(promise: Promise<T>, onrejected: (reason: any) => O) => promise.catch(onrejected),
  forEach = <T>(ary: T[], fn: (item: T, index: number, ary: T[]) => void) => ary.forEach(fn),
  pushItem = <T>(ary: T[], ...item: T[]) => ary.push(...item),
  filterItem = <T, R>(ary: T[], fn: (item: T, index: number, ary: T[]) => R) => ary.filter(fn),
  map = <T, R>(ary: T[], fn: (item: T, index: number, ary: T[]) => R) => ary.map(fn),
  includes = <T>(ary: T[], target: T) => ary.includes(target),
  len = (data: any[] | Uint8Array | string | string) => data.length,
  isArray = (target: any) => Array.isArray(target),
  shift = <T>(ary: T[]) => ary.shift(),
  splice = <T>(ary: T[], start: number, deleteCount = 0, ...items: T[]) => ary.splice(start, deleteCount, ...items),
  getConfig = <S, E, R, T, RC, RE, RH>(methodInstance: Method<S, E, R, T, RC, RE, RH>) => methodInstance.config,
  getContext = <S, E, R, T, RC, RE, RH>(methodInstance: Method<S, E, R, T, RC, RE, RH>) => methodInstance.context,
  JSONStringify = (
    value: any,
    replacer?: ((this: any, key: string, value: any) => any) | undefined,
    space?: string | number | undefined
  ) => JSON.stringify(value, replacer, space),
  JSONParse = (text: string, reviver?: ((this: any, key: string, value: any) => any) | undefined) =>
    JSON.parse(text, reviver),
  objectKeys = (obj: any) => ObjectCls.keys(obj),
  objectValues = (obj: any) => ObjectCls.values(obj),
  setTimeoutFn = (fn: GeneralFn, delay = 0) => setTimeout(fn, delay),
  clearTimeoutFn = (timeoutId?: string | number | NodeJS.Timeout) => clearTimeout(timeoutId),
  regexpTest = (reg: RegExp, str: string) => reg.test(str);

/**
 * 创建同步多次调用只在异步执行一次的执行器
 */
export const createSyncOnceRunner = (delay = 0) => {
  let timer: NodeJS.Timeout | number | undefined = undefinedValue;

  /**
   * 执行多次调用此函数将异步执行一次
   */
  return (fn: () => void) => {
    if (timer) {
      clearTimeoutFn(timer);
    }
    timer = setTimeoutFn(fn, delay);
  };
};

/**
 * 创建uuid简易版
 * @returns uuid
 */
export const uuid = () => {
  const timestamp = new Date().getTime();
  return Math.floor(Math.random() * timestamp).toString(36);
};

const referenceList = [] as { id: string; ref: any }[];
/**
 * 获取唯一的引用类型id，如果是非引用类型则返回自身
 * @param {reference} 引用类型数据
 * @returns uniqueId
 */
export const getUniqueReferenceId = (reference: any) => {
  const refType = typeof reference;
  if (!['object', 'function', 'symbol'].includes(refType)) {
    return reference;
  }

  let existedRef = referenceList.find(({ ref }) => ref === reference);
  if (!existedRef) {
    const uniqueId = uuid();
    existedRef = {
      id: uniqueId,
      ref: reference
    };
    referenceList.push(existedRef);
  }
  return existedRef.id;
};

/**
 * 兼容函数
 */
export const noop = () => {};

/**
 * 兼容函数，返回自身
 * @param value 任意值
 * @returns 自身
 */
export const __self = <T>(value: T) => value;

// 判断是否为某个类的实例
export const instanceOf = <T>(arg: any, cls: new (...args: any[]) => T): arg is T => arg instanceof cls;

/**
 * 构建格式化的错误消息
 * @param prefix 错误前缀
 * @param msg 错误消息
 * @returns 格式化的错误消息
 */
export const buildErrorMsg = (prefix: string, msg: string) => `[alova/${prefix}]${msg}`;

/**
 * 自定义断言函数，表达式为false时抛出错误
 * @param expression 判断表达式，true或false
 * @param msg 断言消息
 */
export const createAssert = (prefix: string) => {
  return (expression: boolean, msg: string) => {
    if (!expression) {
      throw newInstance(Error, buildErrorMsg(prefix, msg));
    }
  };
};

export const valueObject = <T>(value: T, writable = falseValue) => ({
  value,
  writable
});

/**
 * 定义obj属性
 * @param o 对象
 * @param attrs 值对象
 */
export const defineProperty = (o: object, key: string | symbol, value: any, writable = falseValue) => {
  ObjectCls.defineProperty(o, key, valueObject(value, writable));
};

export type GeneralFn = (...args: any[]) => any;
/**
 * 批量执行时间回调函数，并将args作为参数传入
 * @param handlers 事件回调数组
 * @param args 函数参数
 */
export const runArgsHandler = (handlers: GeneralFn[], ...args: any[]) => {
  let ret: any = undefinedValue;
  forEach(handlers, handler => {
    const retInner = handler(...args);
    ret = retInner !== undefinedValue ? retInner : ret;
  });
  return ret;
};

/**
 * typof冗余函数
 * @param arg 任意参数
 * @returns 参数类型
 */
export const typeOf = (arg: any) => typeof arg;

/**
 * 判断参数是否为函数
 * @param fn 任意参数
 * @returns 该参数是否为函数
 */
export const isFn = (arg: any): arg is GeneralFn => typeOf(arg) === 'function';

/**
 * 判断参数是否为字符串
 * @param arg 任意参数
 * @returns 该参数是否为字符串
 */
export const isString = (arg: any): arg is string => typeOf(arg) === 'string';

/**
 * 判断参数是否为对象
 * @param arg 任意参数
 * @returns 该参数是否为对象
 */
export const isObject = <T = any>(arg: any): arg is T => arg !== nullValue && typeOf(arg) === 'object';

/**
 * 判断是否为纯对象或自定义类的对象
 * @param arg 任意参数
 * @returns 该参数是否为纯对象或自定义类的对象
 */
export const isPlainOrCustomObject = (arg: any) => ObjectCls.prototype.toString.call(arg) === '[object Object]';

/**
 * 深层遍历目标对象
 * @param target 目标对象
 * @param callback 遍历回调
 * @param preorder 是否前序遍历，默认为true
 * @param key 当前遍历的key
 * @param parent 当前遍历的父节点
 */
type AttrKey = string | number | symbol;
export const walkObject = (
  target: any,
  callback: (value: any, key: string | number | symbol, parent: any) => void,
  preorder = trueValue,
  key?: AttrKey,
  parent?: any
) => {
  const callCallback = () => {
    if (parent && key) {
      target = callback(target, key, parent);
      if (target !== parent[key]) {
        parent[key] = target;
      }
    }
  };

  // 前序遍历
  preorder && callCallback();
  if (isObject(target)) {
    for (const i in target) {
      if (!instanceOf(target, StringCls)) {
        walkObject(target[i], callback, preorder, i, target);
      }
    }
  }
  // 后序遍历
  !preorder && callCallback();
  return target;
};

/**
 * 创建类实例
 * @param cls 构造函数
 * @param args 构造函数参数
 * @returns 类实例
 */
export const newInstance = <T extends { new (...args: any[]): InstanceType<T> }>(
  cls: T,
  ...args: ConstructorParameters<T>
) => new cls(...args);

/**
 * 统一配置
 * @param 数据
 * @returns 统一的配置
 */
export const sloughConfig = <T>(config: T | ((...args: any[]) => T), args: any[] = []) =>
  isFn(config) ? config(...args) : config;

export const getTime = (date?: Date) => (date ? date.getTime() : Date.now());

/**
 * 判断参数是否为数字
 * @param arg 任意参数
 * @returns 该参数是否为数字
 */
export const isNumber = (arg: any): arg is number => typeof arg === 'number' && !isNaN(arg);

/** 三种缓存模式 */
// 只在内存中缓存，默认是此选项
const MEMORY = 'memory',
  // 缓存会持久化，但当内存中没有缓存时，持久化缓存只会作为响应数据的占位符，且还会发送请求更新缓存

  STORAGE_PLACEHOLDER = 'placeholder',
  // 缓存会持久化，且每次刷新会读取持久化缓存到内存中，这意味着内存一直会有缓存
  STORAGE_RESTORE = 'restore';
/**
 * 获取缓存的配置参数，固定返回{ e: number, m: number, s: boolean, t: string }格式的对象
 * e为expire缩写，表示缓存失效时间点（时间戳），单位为毫秒
 * m为mode缩写，存储模式
 * s为storage缩写，是否存储到本地
 * t为tag缩写，持久化存储标签
 * @param localCache 本地缓存参数
 * @returns 统一的缓存参数对象
 */
export const getLocalCacheConfigParam = <S, E, R, T, RC, RE, RH>(
  methodInstance?: Method<S, E, R, T, RC, RE, RH>,
  localCache?: LocalCacheConfig
) => {
  const _localCache =
    localCache !== undefinedValue ? localCache : methodInstance ? getConfig(methodInstance).localCache : undefinedValue;

  const getCacheExpireTs = (_localCache: CacheExpire) =>
    isNumber(_localCache) ? getTime() + _localCache : getTime(_localCache);
  let cacheMode = MEMORY;
  let expire = 0;
  let storage = falseValue;
  let tag: undefined | string = undefinedValue;
  if (!isFn(_localCache)) {
    if (isNumber(_localCache) || instanceOf(_localCache, Date)) {
      expire = getCacheExpireTs(_localCache);
    } else {
      const { mode = MEMORY, expire: configExpire = 0, tag: configTag } = _localCache || {};
      cacheMode = mode;
      expire = getCacheExpireTs(configExpire);
      storage = [STORAGE_PLACEHOLDER, STORAGE_RESTORE].includes(mode);
      tag = configTag ? configTag.toString() : undefinedValue;
    }
  }
  return {
    e: expire,
    m: cacheMode,
    s: storage,
    t: tag
  };
};

/**
 * 根据避让策略和重试次数计算重试延迟时间
 * @param backoff 避让参数
 * @param retryTimes 重试次数
 * @returns 重试延迟时间
 */
export const delayWithBackoff = (backoff: BackoffPolicy, retryTimes: number) => {
  let { delay, multiplier = 1, startQuiver, endQuiver } = backoff;
  let retryDelayFinally = (delay || 0) * Math.pow(multiplier, retryTimes - 1);
  // 如果startQuiver或endQuiver有值，则需要增加指定范围的随机抖动值
  if (startQuiver || endQuiver) {
    startQuiver = startQuiver || 0;
    endQuiver = endQuiver || 1;
    retryDelayFinally +=
      retryDelayFinally * startQuiver + Math.random() * retryDelayFinally * (endQuiver - startQuiver);
    retryDelayFinally = Math.floor(retryDelayFinally); // 取整数延迟
  }
  return retryDelayFinally;
};
