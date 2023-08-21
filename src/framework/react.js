import { isArray, isFn, isObject, map, noop, pushItem } from '@/helper';
import { falseValue } from '@/helper/variables';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * 创建状态
 * 当isRef为true时，将会在_$中获得最新的值而不受闭包陷阱影响
 * @param initialState 创建状态的数据
 * @param {boolean|void} isRef 是否创建为引用值
 * @returns
 */
export const $ = (initialState, isRef) => {
  const state = useState(initialState);
  if (isRef) {
    const ref = useFlag$();
    ref.current = state[0];
    state[2] = ref; // 将引用值保存到数组中
  }
  return state;
};

/**
 * 创建计算属性
 * 为了兼容$函数中创建的状态可以在exportState中导出，将格式与$返回值靠齐
 * @param factory 计算属性计算函数
 * @param deps 依赖值
 * @param {boolean|void} isRef 是否创建为引用值
 * @returns 类$返回值
 */
export const $$ = (factory, deps, isRef) => {
  const memo = useMemo(factory, deps);
  const memoAry = [memo, noop];
  if (isRef) {
    const ref = useFlag$();
    ref.current = memo;
    pushItem(memoAry, ref);
  }
  return memoAry;
};

/**
 * 脱水普通状态、计算属性或alova导出的状态，返回状态原始值
 * 有引用值时返回引用值，否则返回原始值
 * @param state 状态
 * @returns 状态原始值，即状态对应的数据
 */
export const _$ = state => {
  if (isArray(state) && isFn(state[1])) {
    return state[2] ? state[2].current : state[0];
  }
  return state;
};

/**
 * 返回导出值
 * 导出状态原始值，一般用于导出use hook的值，或在依赖项使用
 * @param state 状态
 * @returns 状态原始值
 */
export const _exp$ = state => (isArray(state) && isFn(state[1]) ? state[0] : state);

/**
 * 批量导出状态
 * @param state 状态
 * @returns 状态原始值
 */
export const _expBatch$ = (...states) => map(states, s => _exp$(s));

/**
 * 更新状态值
 * @param state 更新的状态
 * @param newData 新状态值
 */
export const upd$ = (state, newData) => {
  if (isFn(newData)) {
    const oldState = state[2] ? state[2].current : state[0];
    newData = newData(isArray(oldState) ? [...oldState] : isObject(oldState) ? { ...oldState } : oldState);
  }
  state[1](newData);

  // 如果有引用类型值，也要更新它
  if (state[2]) {
    state[2].current = newData;
  }
};

/**
 * 监听状态触发回调
 * @param {import('react').DependencyList} states 监听状态
 * @param {Function} cb 回调函数
 */
export const watch$ = (states, cb) => {
  // 当有监听状态时，状态变化再触发
  const needEmit = useRef(falseValue);
  useEffect(() => {
    needEmit.current ? cb() : (needEmit.current = true);
  }, states);
};

/**
 * 组件挂载执行
 * @param {Function} cb 回调函数
 */
export const onMounted$ = cb => useEffect(cb, []);

/**
 * 使用标识，一般作为标识
 * 在react中每次渲染都会调用hook，如果使用基础数据每次将会获得初始值
 * 为解决这个问题，在react中需使用useRef作为标识
 * @param initialValue 初始值
 */
export const useFlag$ = initialValue => useRef(initialValue);

/**
 * 将alova的hook返回状态如loading、data等转换为不受闭包陷阱影响的值
 * 由于在react下，use hook返回的loading、data等状态为普遍值，将会受闭包影响
 * 因此使用此函数将普通值转换为跨闭包的值
 * @param requestState 请求hook状态
 */
export const useRequestRefState$ = requestState => {
  const requestStateWrapper = [requestState, noop];
  const ref = useFlag$();
  ref.current = requestState;
  pushItem(requestStateWrapper, ref);
  return requestStateWrapper;
};

/**
 * 它返回的回调函数始终为同一份引用，同时callback中访问的状态不受闭包陷阱影响
 * @param callback
 * @returns
 */
export const useMemorizedCallback$ = callback => {
  const ref = useFlag$();
  ref.current = callback;
  return useCallback((...args) => {
    callback.apply(null, args);
  }, []);
};
