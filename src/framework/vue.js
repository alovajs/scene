import { computed, ref, watch as vueWatch } from 'vue';
import { map } from '../helper';
import { trueValue } from '../helper/variables';

/**
 * 创建状态
 * @param data 创建状态的数据
 * @returns {FrameworkState}
 */
export const $ = ref;

/**
 * 创建计算属性
 * @param data 创建计算属性的数据
 * @returns {FrameworkState}
 */
export const $$ = computed;

/**
 * 脱水普通状态、计算属性或alova导出的状态，返回状态原始值
 * @param state 状态
 * @returns 状态原始值，即状态对应的数据
 */
export const _$ = state => state.value;

/**
 * 状态导出
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
	state.value = typeof newData === 'function' ? newData(state.value) : newData;
};

/**
 * 监听状态触发回调
 * @param {import('vue').WatchSource} states 监听状态
 * @param {Function} cb 回调函数
 */
export const watch = (states, cb) => {
	vueWatch(states, cb, {
		flush: 'sync',
		deep: trueValue
	});
};
