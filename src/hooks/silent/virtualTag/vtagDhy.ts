import { instanceOf } from '../../../helper';
import { falseValue, nullValue, strValueOf, undefinedValue } from '../../../helper/variables';
import { vTagCollectUnified } from './helper';
import Null from './Null';
import Undefined from './Undefined';
import { symbolOriginalValue, symbolVirtualTag } from './variables';

/**
 * 获取带虚拟标签变量的原始值
 * 如果是带虚拟标签的基本类型包装类（包含自定义的Null和Undefined），将返回原始值
 * 否则根据referenceVtagReturnSelf判断返回target本身还是原始值
 *
 * 此函数也将会进行vTag收集
 * @param target 目标值
 * @param referenceVtagReturnSelf 引用类型的虚拟标签是否返回本身
 * @returns 具有原始类型的目标值
 */
export const vtagDehydrateUnified = (target: any, referenceVtagReturnSelf: boolean) => {
  vTagCollectUnified(target);
  if (instanceOf(target, Undefined)) {
    target = undefinedValue;
  } else if (instanceOf(target, Null)) {
    target = nullValue;
  } else if (target && target[symbolVirtualTag]) {
    target =
      // 是vtag时，再判断如果是基本类型包装类则返回原始值
      // 如果是引用类型则根据referenceVtagReturnSelf判断是返回本身还是原始值
      instanceOf(target, Number) || instanceOf(target, String) || instanceOf(target, Boolean)
        ? target[strValueOf]()
        : referenceVtagReturnSelf
        ? target
        : target[symbolOriginalValue];
  }
  return target;
};

/**
 * 上面函数referenceVtagReturnSelf为false的版本，将对外导出
 */
export default (target: any) => vtagDehydrateUnified(target, falseValue);
