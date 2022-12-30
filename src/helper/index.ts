import { Alova, Method } from 'alova';
import { falseValue, ObjectCls, PromiseCls } from './variables';

export const promiseResolve = <T>(value: T) => PromiseCls.resolve(value),
  promiseReject = <T>(value: T) => PromiseCls.reject(value),
  promiseThen = <T, TResult1 = T, TResult2 = never>(
    promise: Promise<T>,
    onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> => promise.then(onFulfilled, onrejected),
  promiseCatch = <T, O>(promise: Promise<T>, onrejected: (reason: any) => O) => promise.catch(onrejected),
  promiseFinally = <T, O>(promise: Promise<T>, onrejected: (reason: any) => O) => promise.catch(onrejected),
  forEach = <T>(ary: T[], fn: (item: T, index: number, ary: T[]) => void) => ary.forEach(fn),
  pushItem = <T>(ary: T[], ...item: T[]) => ary.push(...item),
  map = <T, R>(ary: T[], fn: (item: T, index: number, ary: T[]) => R) => ary.map(fn),
  includes = <T>(ary: T[], target: T) => ary.includes(target),
  len = (data: any[] | Uint8Array | string | string) => data.length,
  isArray = (target: any) => Array.isArray(target),
  shift = <T>(ary: T[]) => ary.shift(),
  splice = <T>(ary: T[], start: number, deleteCount = 0, ...items: T[]) => ary.splice(start, deleteCount, ...items),
  getContext = <S, E, R, T, RC, RE, RH>(methodInstance: Method<S, E, R, T, RC, RE, RH>) => methodInstance.context,
  getConfig = <S, E, R, T, RC, RE, RH>(methodInstance: Method<S, E, R, T, RC, RE, RH>) => methodInstance.config,
  getContextOptions = <S, E, RC, RE, RH>(alovaInstance: Alova<S, E, RC, RE, RH>) => alovaInstance.options,
  getOptions = <S, E, R, T, RC, RE, RH>(methodInstance: Method<S, E, R, T, RC, RE, RH>) =>
    getContextOptions(getContext(methodInstance)),
  JSONStringify = (
    value: any,
    replacer?: ((this: any, key: string, value: any) => any) | undefined,
    space?: string | number | undefined
  ) => JSON.stringify(value, replacer, space),
  JSONParse = (text: string, reviver?: ((this: any, key: string, value: any) => any) | undefined) =>
    JSON.parse(text, reviver),
  objectKeys = (obj: any) => Object.keys(obj),
  objectValues = <T>(obj: Record<any, T>) => Object.values(obj),
  setTimeoutFn = (fn: GeneralFn, delay = 0) => setTimeout(fn, delay),
  clearTimeoutTimer = (timer: NodeJS.Timeout) => clearTimeout(timer),
  strReplace = (str: string, searchValue: any, replaceValue: string) => str.replace(searchValue, replaceValue);

/**
 * 创建同步多次调用只在异步执行一次的执行器
 */
export const createSyncOnceRunner = (delay = 0) => {
  let timer: NodeJS.Timer;

  /**
   * 执行多次调用此函数将异步执行一次
   */
  return (fn: () => void) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(fn, delay);
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

export const noop = () => {};

// 判断是否为某个类的实例
export const instanceOf = <T>(arg: any, cls: new (...args: any[]) => T): arg is T => arg instanceof cls;

/**
 * 自定义断言函数，表达式为false时抛出错误
 * @param expression 判断表达式，true或false
 * @param msg 断言消息
 */
export const createAssert = (prefix: string) => {
  return (expression: boolean, msg: string) => {
    if (!expression) {
      throw newInstance(Error, `[alova/${prefix}:Error]${msg}`);
    }
  };
};

export const valueObject = <T>(value: T, writable = false) => ({
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
export const runArgsHandler = (handlers: GeneralFn[], ...args: any[]) => forEach(handlers, handler => handler(...args));

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
 * 判断参数是否为数字
 * @param arg 任意参数
 * @returns 该参数是否为数字
 */
export const isNumber = (arg: any): arg is number => typeOf(arg) === 'number' && !isNaN(arg);

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
export const isObject = (arg: any) => typeOf(arg) === 'object';

/**
 * 深层遍历目标对象
 * @param target 目标对象
 */
type AttrKey = string | number | symbol;
export const walkObject = (
  target: any,
  callback: (value: any, key: string | number | symbol, parent: any) => void,
  key?: AttrKey,
  parent?: any
) => {
  parent && key && (target = parent[key] = callback(target, key, parent));
  if (isObject(target)) {
    for (const i in target) {
      // TODO: 这层判断现在是否可以去掉了？
      if (!instanceOf(target, String)) {
        target[i] = walkObject(target[i], callback, i, target);
      }
    }
  }
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
 * 解析函数参数
 * @param fn 目标函数
 * @returns 此函数的参数数组
 */
export const parseFunctionParams = (fn: GeneralFn | string) => {
  let fnStr = fn + '';
  const isCommonFn = fnStr.startsWith('function');
  fnStr = strReplace(fnStr, /\/\/.*$/gm, ''); // strip single-line comments
  fnStr = strReplace(fnStr, /\s+/g, ''); // strip white space
  fnStr = strReplace(fnStr, /\/\*[\s\S]+?\*\//g, '') // strip multi-line comments
    .split(isCommonFn ? '){' : /\)?=>/, 1)?.[0];
  fnStr = strReplace(fnStr, /^[^(]*[(]/, ''); // extract the parameters
  return strReplace(fnStr, /=[^,]+/g, '') // strip any ES6 defaults
    .split(',')
    .filter(item => (item ? /^(\.\.\.)?[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(item) : falseValue)); // 过滤没有值的和不符合变量名的
};

/**
 * 解析函数体
 * @param fn 目标函数
 * @returns 此函数的函数体
 */
export const parseFunctionBody = (fn: GeneralFn | string) => {
  let fnStr = fn + '';
  fnStr = strReplace(fnStr, /\/\/.*$/gm, ''); // strip single-line comments
  fnStr = strReplace(fnStr, /\/\*[\s\S]+?\*\//g, ''); // strip multi-line comments
  fnStr = strReplace(fnStr, /^(function\s*([\s\S]*?)\)\s*{|\(?([\s\S]*?)\)?\s*=>\s*{?\s*)/, '');
  fnStr = fnStr.endsWith('}') ? fnStr.substring(0, len(fnStr) - 1) : `return ${fnStr}`;
  return fnStr.trim();
};
