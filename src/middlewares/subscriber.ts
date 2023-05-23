import { createAssert, filterItem, forEach, instanceOf, isNumber, isString, objectKeys, pushItem } from '@/helper';
import { falseValue, trueValue } from '@/helper/variables';
import { AlovaFetcherMiddlewareContext, AlovaFrontMiddlewareContext, AlovaGuardNext } from 'alova';
import { Handlers } from '~/typings/general';

type AnyAlovaFrontMiddlewareContext = AlovaFrontMiddlewareContext<any, any, any, any, any, any, any>;
type AnyAlovaFetcherMiddlewareContext = AlovaFetcherMiddlewareContext<any, any, any, any, any, any, any>;

const handlersMap: Record<string | number | symbol, Handlers[]> = {};
const isFrontMiddlewareContext = (
  context: AnyAlovaFrontMiddlewareContext | AnyAlovaFetcherMiddlewareContext
): context is AnyAlovaFrontMiddlewareContext => !!(context as AnyAlovaFrontMiddlewareContext).send;

const assert = createAssert('subscriber');

/**
 * 订阅者中间件
 * 使用此中间件后可通过notifyHandlers直接调用订阅的函数
 * 可以订阅多个相同id
 * 以此来消除组件的层级限制
 * @param id 订阅者id
 * @returns alova中间件函数
 */
export const subscriberMiddleware = (id: string | number | symbol) => {
  let subscribe = falseValue;
  return (
    context: (AnyAlovaFrontMiddlewareContext | AnyAlovaFetcherMiddlewareContext) & { subscribeHandlers?: Handlers },
    next: AlovaGuardNext<any, any, any, any, any, any, any>
  ) => {
    // 中间件会重复调用，已经订阅过了就无需再订阅了
    if (!subscribe) {
      const { abort, subscribeHandlers = {} } = context;
      // 相同id的将以数组形式保存在一起
      const handlersItems = (handlersMap[id] = handlersMap[id] || []);
      handlersItems.push(
        isFrontMiddlewareContext(context)
          ? {
              ...subscribeHandlers,
              send: context.send,
              abort
            }
          : {
              ...subscribeHandlers,
              fetch: context.fetch,
              abort
            }
      );

      subscribe = trueValue;
    }
    return next();
  };
};

/**
 * 通知订阅函数，如果匹配多个则会以此调用onMatch
 * @param id 订阅者id，或正则表达式
 * @param onMatch 匹配的订阅者
 */
export const notifyHandler = (
  id: string | number | symbol | RegExp,
  onMatch: (matchedSubscriber: Handlers, index: number) => void
) => {
  const matched = [] as Handlers[];
  if (typeof id === 'symbol' || isString(id) || isNumber(id)) {
    assert(!!handlersMap[id], `not match handlers which id is \`${id.toString()}\``);
    pushItem(matched, ...handlersMap[id]);
  } else if (instanceOf(id, RegExp)) {
    forEach(
      filterItem(objectKeys(handlersMap), idItem => id.test(idItem)),
      idItem => {
        pushItem(matched, ...handlersMap[idItem]);
      }
    );
  }
  forEach(matched, onMatch);
};
