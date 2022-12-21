// 以下为减少编译代码量而添加的统一处理函数或变量
export const PromiseCls = Promise as typeof Promise<any>,
	undefinedValue = undefined,
	nullValue = null,
	trueValue = true,
	falseValue = false,
	symbolToPrimitive = Symbol.toPrimitive,
	strValueOf = 'valueOf',
	strToString = 'toString',
	ObjectCls = Object,
	defaultQueueName = 'default',
	behaviorSilent = 'silent',
	behaviorQueue = 'queue',
	behaviorStatic = 'static';
