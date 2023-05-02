interface FrameworkState<T> {}
interface FrameworkExportedValue<T> {}

/**
 * 创建状态
 * @param value 创建状态的数据
 * @returns {FrameworkState} 对应框架的状态值，不同框架返回的不一样
 */
export type T$ = <T>(value: T) => FrameworkState<T>;

/**
 * 创建计算属性
 * @param getter 计算属性回调
 * @returns {FrameworkState} 对应框架的状态值，不同框架返回的不一样
 */
export type T$$ = <T>(getter: () => T, deps: FrameworkExportedValue<any>[]) => FrameworkState<T>;

/**
 * 脱水普通状态、计算属性或alova导出的状态，返回状态原始值
 * @param state 状态
 * @returns 状态原始值，即状态对应的数据
 */
export type T_$ = <T>(state: FrameworkState<T>) => T;

/**
 * 状态导出
 * @param state 状态
 * @returns 状态原始值
 */
export type T_exp$ = <T>(state: FrameworkState<T>) => FrameworkExportedValue<T>;

/**
 * 批量导出状态
 * @param state 状态
 * @returns 状态原始值
 */
export type T_expBatch$ = <T>(...states: FrameworkState<T>[]) => FrameworkExportedValue<T>[];

/**
 * 更新状态值
 * @param state 更新的状态
 * @param newData 新状态值
 */
export type Tupd$ = <T>(state: FrameworkState<T>, cb: T | ((originalValue: T) => T)) => void;

/**
 * 监听状态触发回调
 * @param states 监听状态
 * @param {Function} cb 回调函数
 */
export type watch = (states: FrameworkState<any>[], cb: () => void) => void;
