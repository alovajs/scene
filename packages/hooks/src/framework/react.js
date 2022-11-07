import { useMemo, useState } from 'react';

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
export const _expBatch$ = (...states) => states.map(s => _exp$(s));

/**
 * 更新状态值
 * @param state 更新的状态
 * @param newData 新状态值
 */
export const upd$ = (state, newData) => state[1](newData);

export const watchSync = () => {};
