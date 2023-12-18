import { Writable } from 'svelte/store';
import { Ref } from 'vue';

export type FrameworkState<T> = T | Ref<T> | Writable<T>;
export interface FrameworkExportedValue<T> {
  [x: string]: T;
}

/**
 * 创建状态
 * @param initialValue 创建状态的数据
 * @param isReactRefState 设置为true后将不受react闭包陷阱影响，只对react有效
 * @returns {FrameworkState} 对应框架的状态值，不同框架返回的不一样
 */
export type T$ = <T>(initialValue: T, isReactRefState?: boolean) => FrameworkState<T>;

/**
 * 创建计算属性
 * @param getter 计算属性回调
 * @param deps 监听依赖项
 * @param isReactRefState 设置为true后将不受react闭包陷阱影响，只对react有效
 * @returns {FrameworkState} 对应框架的状态值，不同框架返回的不一样
 */
export type T$$ = <T>(
  getter: () => T,
  deps: FrameworkExportedValue<any>[],
  isReactRefState?: boolean
) => FrameworkState<T>;

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
export type Twatch$ = (states: FrameworkState<any>[], cb: () => void) => void;

/**
 * @param {Function} cb 回调函数
 */
export type TonMounted$ = (cb: () => void) => void;

/**
 * @param {Function} cb 回调函数
 */
export type TonUnmounted$ = (cb: () => void) => void;

/**
 * 使用标识，一般作为标识
 * 在react中每次渲染都会调用hook，如果使用基础数据每次将会获得初始值
 * 兼容react
 * @param initialValue 初始值
 */
export type TuseFlag$ = <T>(initialValue: T) => { current: T };

/**
 * 将alova的hook返回状态如loading、data等转换为不受闭包陷阱影响的值
 * 由于在react下，use hook返回的loading、data等状态为普遍值，将会受闭包影响
 * 因此使用此函数将普通值转换为跨闭包的值
 * @param requestState 请求hook状态
 */
export type TuseRequestRefState$ = <T>(requestState: T) => FrameworkState<T>;

/**
 * 由于在react下，如果每次传入子组件的callback引用变化会导致子组件重新渲染，而引起性能问题
 * 此函数作为兼容react而存在
 * @param callback
 * @returns
 */
export type TuseMemorizedCallback$ = <T>(callback: T) => T;
