import { createAssert, isArray, len, promiseResolve, shift } from '@/helper';
import { undefinedValue } from '@/helper/variables';
import { AlovaFrontMiddleware, AlovaMethodHandler, Method } from 'alova';

/**
 * 断言serialHandlers
 * @param hookName hook name
 * @param serialHandlers 串行请求method获取函数
 */
export const assertSerialHandlers = (hookName: string, serialHandlers: any) =>
  createAssert(hookName)(
    isArray(serialHandlers) && len(serialHandlers) > 0,
    'please use an array to represent serial requests'
  );

export type SerialHandlers<S, E, R, T, RC, RE, RH> = [
  Method<S, E, R, T, RC, RE, RH> | AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
  ...AlovaMethodHandler<S, E, R, T, RC, RE, RH>[]
];

/**
 * 创建串行请求中间件
 * @param serialHandlers 串行请求method获取函数
 * @param hookMiddleware use hook的中间件
 * @returns 串行请求中间件
 */
export const serialMiddleware = <S, E, R, T, RC, RE, RH>(
  serialHandlers: SerialHandlers<S, E, R, T, RC, RE, RH>,
  hookMiddleware?: AlovaFrontMiddleware<S, E, R, T, RC, RE, RH>
) => {
  // 第一个handler在外部传递给了use hook，不需要再次请求
  shift(serialHandlers);
  return ((ctx, next) => {
    hookMiddleware?.(ctx, () => promiseResolve(undefinedValue as any));
    let serialPromise = next();
    for (const i in serialHandlers) {
      serialPromise = serialPromise.then(value =>
        (serialHandlers as AlovaMethodHandler<S, E, R, T, RC, RE, RH>[])[i](value, ...ctx.sendArgs).send()
      );
    }
    return serialPromise;
  }) as AlovaFrontMiddleware<S, E, R, T, RC, RE, RH>;
};
