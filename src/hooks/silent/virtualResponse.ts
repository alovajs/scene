import { includes, instanceOf, valueObject } from '../../helper';
import { nullValue, undefinedValue } from '../../helper/variables';
import Null from './Null';
import Undefined from './Undefined';

export const virtualTagSymbol = Symbol('virvual-tag');
/**
 * 为目标值打上虚拟标签的标记
 * @param target 目标实例
 * @returns void
 */
export const signVirtualTag = (target: any) => {
	if (includes([nullValue, undefinedValue], target) || instanceOf(target, Null) || instanceOf(target, Undefined)) {
		return;
	}
	Object.defineProperty(target, virtualTagSymbol, valueObject(true));
};

/** 辅助函数 */
/**
 * 获取带虚拟标签变量的原始值
 * 如果是带虚拟标签的基本类型包装类（包含自定义的Null和Undefined），将返回原始值
 * 否则返回target本身
 * @param target 目标值
 * @returns 具有原始类型的目标值
 */
export const valueOf = (target: any) => {
	if (instanceOf(target, Undefined)) {
		target = undefinedValue;
	} else if (instanceOf(target, Null)) {
		target = nullValue;
	} else if (target && includes([Number, String, Boolean], target.constructor) && target[virtualTagSymbol]) {
		target = target.valueOf();
	}
	return target;
};

/**
 * 创建代理实例，包装类不支持Symbol数据类型，因为symbol没有包装类
 * @param target 代理目标实例
 * @returns 代理实例
 */
const proxify = (target: InstanceType<typeof Null | typeof Undefined>, actualValue?: any) =>
	new Proxy(target, {
		get(target, key) {
			return includes([Symbol.toPrimitive, 'typeof', 'valueOf'], key)
				? target[key as keyof typeof target]
				: actualValue[key];
		}
	});

export const createNullWrapper = () => proxify(new Null());
export const createUndefinedWrapper = () => proxify(new Undefined());

/**
 * 创建虚拟响应数据实例
 * @returns 虚拟响应数据代理实例
 */
export const createVirtualResponse = () =>
	new Proxy(
		{},
		{
			get: () => 1
		}
	);
