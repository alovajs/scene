import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { map } from '../helper';
import { falseValue } from '../helper/variables';

/**
 * 创建状态
 * @param data 创建状态的数据
 * @returns {FrameworkState}
 */
export const $ = useState;

/**
 * 创建计算属性
 * @param data 创建计算属性的数据
 * @returns {FrameworkState}
 */
export const $$ = useMemo;

/**
 * 脱水普通状态、计算属性或alova导出的状态，返回状态原始值
 * @param state 状态
 * @returns 状态原始值，即状态对应的数据
 */
const exportState = state => (Array.isArray(state) && typeof state[1] === 'function' ? state[0] : state);

export const _$ = exportState;
export const _exp$ = exportState;

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
export const upd$ = (state, newData) => state[1](newData);

/**
 * 监听状态触发回调
 * @param {import('react').DependencyList} states 监听状态
 * @param {Function} cb 回调函数
 */
export const watch = (states, cb) => {
	// 当有监听状态时，状态变化再触发
	const needEmit = useRef(falseValue);
	useLayoutEffect(() => {
		needEmit.current ? cb() : (needEmit.current = true);
	}, states);
};
