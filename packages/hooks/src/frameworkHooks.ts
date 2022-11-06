import { ExportedType } from 'alova';
import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { derived, Readable, Writable, writable } from 'svelte/store';
import { computed, ComputedRef, Ref, ref } from 'vue';

/** @description 以下函数用于在不同框架中统一行为，因此在编写hooks时我们不需要对不同框架做兼容处理，且可以通过编译工具去除对应代码 */

const unknownFrameworkError = 'unknown framework, please check the env variable `EXTENSION`';
type ReactState<T> = [T, Dispatch<SetStateAction<T>>];
export type FrameworkState<T> = ReturnType<typeof $<T>>;
export type FrameworkComputed<T> = T | ComputedRef<T> | Readable<T>;

/**
 * 创建状态
 * @param data 创建状态的数据
 * @returns {FrameworkState}
 */
export const $ = <T>(data: T) => {
	if (process.env.EXTENSION === 'vuehooks') {
		return ref(data);
	} else if (process.env.EXTENSION === 'reacthooks') {
		return useState(data);
	} else if (process.env.EXTENSION === 'sveltehooks') {
		return writable(data);
	}
	throw new Error(unknownFrameworkError);
};

/**
 * 创建计算属性
 * @param data 创建计算属性的数据
 * @returns {FrameworkState}
 */
export const compt$ = <T, R, S>(
	getter: (...args: any[]) => T,
	depList: (ExportedType<R, S> | FrameworkComputed<T>)[]
) => {
	if (process.env.EXTENSION === 'vuehooks') {
		return computed(getter);
	} else if (process.env.EXTENSION === 'reacthooks') {
		return useMemo(getter, depList);
	} else if (process.env.EXTENSION === 'sveltehooks') {
		return derived(depList as Writable<T>[], getter);
	}
	throw new Error(unknownFrameworkError);
};

/**
 * 脱水$函数创建的状态，返回状态原始值
 * @param state 状态
 * @returns 状态原始值，即状态对应的数据
 */
export const deh$ = <T>(state: FrameworkState<T>) => {
	if (process.env.EXTENSION === 'vuehooks') {
		return (state as Ref<T>).value;
	} else if (process.env.EXTENSION === 'reacthooks') {
		return (state as ReactState<T>)[0];
	} else if (process.env.EXTENSION === 'sveltehooks') {
		let raw = undefined;
		// 订阅时会立即执行一次函数，获取到值后立即调用解除订阅函数
		(state as Writable<T>).subscribe(value => (raw = value))();
		return raw as T;
	}
	throw new Error(unknownFrameworkError);
};

/**
 * 脱水Alova所导出的状态
 * @param state 状态
 * @returns 状态原始值
 */
export const deh$$ = <R, S>(state: ExportedType<R, S>) => {
	if (process.env.EXTENSION === 'vuehooks') {
		return (state as Ref<R>).value;
	} else if (process.env.EXTENSION === 'reacthooks') {
		return state as R;
	} else if (process.env.EXTENSION === 'sveltehooks') {
		let raw = undefined;
		// 订阅时会立即执行一次函数，获取到值后立即调用解除订阅函数
		(state as Writable<R>).subscribe(value => (raw = value))();
		return raw as R;
	}
	throw new Error(unknownFrameworkError);
};

/**
 * 脱水Alova所导出的状态
 * @param state 状态
 * @returns 状态原始值
 */
export const deh_c$ = <T>(compt: FrameworkComputed<T>) => {
	if (process.env.EXTENSION === 'vuehooks') {
		return (compt as ComputedRef<T>).value;
	} else if (process.env.EXTENSION === 'reacthooks') {
		return compt as T;
	} else if (process.env.EXTENSION === 'sveltehooks') {
		let raw = undefined;
		// 订阅时会立即执行一次函数，获取到值后立即调用解除订阅函数
		(compt as Readable<T>).subscribe(value => (raw = value))();
		return raw as T;
	}
	throw new Error(unknownFrameworkError);
};

/**
 * 更新状态值
 * @param state 更新的状态
 * @param newData 新状态值
 */
export const upd$ = <T>(state: FrameworkState<T>, newData: T | ((prev: T) => T)) => {
	if (process.env.EXTENSION === 'vuehooks') {
		(state as Ref<T>).value = typeof newData === 'function' ? (newData as Function)((state as Ref<T>).value) : newData;
	} else if (process.env.EXTENSION === 'reacthooks') {
		(state as ReactState<T>)[1](newData);
	} else if (process.env.EXTENSION === 'sveltehooks') {
		if (typeof newData === 'function') {
			(state as Writable<T>).update(newData as (prev: T) => T);
		} else {
			(state as Writable<T>).set(newData);
		}
	}
};
