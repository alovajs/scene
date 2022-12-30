export const symbolVTagId = Symbol('vtagId'),
  symbolIsProxy = Symbol('isProxy'),
  symbolOriginalValue = Symbol('original'),
  regVirtualTag = /\[vtag:([0-9a-z]+)\]/g,
  serializeUndefFlag = 'alova.silent.undef';
