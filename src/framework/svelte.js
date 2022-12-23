import { derived, writable } from 'svelte/store';
import { createSyncOnceRunner, map } from '../helper';
import { falseValue, trueValue, undefinedValue } from '../helper/variables';

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
  typeof newData === 'function' ? state.update(newData) : state.set(newData);
};

/**
 * 监听状态触发回调
 * @param {import('svelte/store').Readable[]} states 监听状态
 * @param {Function} cb 回调函数
 */
export const watch = (states, cb) => {
  let emited = falseValue;
  let subscribeStage = trueValue;
  const syncRunner = createSyncOnceRunner();
  const subscribeCb = () => {
    if (!emited && !subscribeStage) {
      cb();
      emited = trueValue;
    }
    syncRunner(() => {
      emited = subscribeStage = falseValue;
    });
  };
  states.forEach(state => {
    state.subscribe(subscribeCb);
  });
};
