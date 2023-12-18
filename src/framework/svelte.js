import { __self, createSyncOnceRunner, isFn, map } from '@/helper';
import { falseValue, trueValue, undefinedValue } from '@/helper/variables';
import { onDestroy, onMount } from 'svelte';
import { derived, writable } from 'svelte/store';

/**
 * 创建状态
 * @param data 创建状态的数据
 * @returns {Writable}
 */
export const $ = data => writable(data);

/**
 * 创建计算属性
 * @param data 创建计算属性的数据
 * @returns {import('svelte/store').Readable}
 */
export const $$ = (getter, depList) => derived(depList, getter);

/**
 * 脱水普通状态、计算属性或alova导出的状态，返回状态原始值
 * @param state 状态
 * @returns 状态原始值，即状态对应的数据
 */
export const _$ = state => {
  let raw = undefinedValue;
  // 订阅时会立即执行一次函数，获取到值后立即调用解除订阅函数
  state.subscribe(value => (raw = value))();
  return raw;
};

/**
 * 状态导出，返回原值
 * @param state 状态
 * @returns 状态原始值
 */
export const _exp$ = state => state;

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
    newData = newData(_$(state));
  }
  state.set(newData);
  return newData;
};

/**
 * 监听状态触发回调
 * @param {import('svelte/store').Readable[]} states 监听状态
 * @param {Function} cb 回调函数
 */
export const watch$ = (states, handler) => {
  let needEmit = falseValue;
  const syncRunner = createSyncOnceRunner();
  states.forEach(state => {
    state.subscribe(() => {
      syncRunner(() => {
        needEmit ? handler() : (needEmit = trueValue);
      });
    });
  });
};

/**
 * 组件挂载执行
 * @param {Function} cb 回调函数
 */
export const onMounted$ = cb => {
  onMount(cb);
};

/**
 * 组件卸载执行
 * @param {Function} cb 回调函数
 */
export const onUnmounted$ = cb => {
  onDestroy(cb);
};

/**
 * 使用标识，一般作为标识
 * 在react中每次渲染都会调用hook，如果使用基础数据每次将会获得初始值
 * 兼容react
 * @param initialValue 初始值
 */
export const useFlag$ = initialValue => ({ current: initialValue });

/**
 * 由于在react下，use hook返回的loading、data等状态为普遍值，将会受闭包影响
 * 此函数作为兼容react而存在
 * @param requestState 请求hook状态
 */
export const useRequestRefState$ = __self;

/**
 * 由于在react下，如果每次传入子组件的callback引用变化会导致子组件重新渲染，而引起性能问题
 * 此函数作为兼容react而存在
 * @param callback
 * @returns
 */
export const useMemorizedCallback$ = __self;
