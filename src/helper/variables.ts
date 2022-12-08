// 以下为减少编译代码量而添加的统一处理函数或变量
export const PromiseCls = Promise as typeof Promise<any>;
export const undefinedValue = undefined;
export const nullValue = null;
export const trueValue = true;
export const falseValue = false;
export const symbolToPrimitive = Symbol.toPrimitive;
export const strValueOf = 'valueOf';
export const strToString = 'toString';
export const ObjectCls = Object;
