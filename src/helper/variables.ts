// 以下为减少编译代码量而添加的统一处理函数或变量
export const PromiseCls = Promise as typeof Promise<any>,
  undefinedValue = undefined,
  nullValue = null,
  trueValue = true,
  falseValue = false,
  symbolToPrimitive = Symbol.toPrimitive,
  symbolToStringTag = Symbol.toStringTag,
  strValueOf = 'valueOf',
  strToString = 'toString',
  ObjectCls = Object,
  NumberCls = Number,
  StringCls = String,
  BooleanCls = Boolean,
  defaultQueueName = 'default',
  behaviorSilent = 'silent',
  behaviorQueue = 'queue',
  behaviorStatic = 'static';
