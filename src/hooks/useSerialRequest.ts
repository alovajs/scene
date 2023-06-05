import { createAssert, isArray, len, noop, promiseResolve, shift } from '@/helper';
import { undefinedValue } from '@/helper/variables';
import { AlovaMethodHandler, Method, RequestHookConfig, useRequest } from 'alova';

const serialAssert = createAssert('useSerialRequest');
export default <S, E, R, T, RC, RE, RH>(
  serialHandlers: [
    Method<S, E, R, T, RC, RE, RH> | AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
    ...AlovaMethodHandler<S, E, R, T, RC, RE, RH>[]
  ],
  config: RequestHookConfig<S, E, R, T, RC, RE, RH> = {}
) => {
  const { middleware = noop } = config;
  serialAssert(isArray(serialHandlers) && len(serialHandlers) > 0, 'please use an array to represent serial requests');

  const firstHandler = shift(serialHandlers) as
    | Method<S, E, R, T, RC, RE, RH>
    | AlovaMethodHandler<S, E, R, T, RC, RE, RH>;
  return useRequest(firstHandler, {
    ...config,
    middleware(ctx, next) {
      middleware(ctx, () => promiseResolve(undefinedValue as any));
      let serialPromise = next();
      for (const i in serialHandlers) {
        serialPromise = serialPromise.then(value =>
          (serialHandlers as AlovaMethodHandler<S, E, R, T, RC, RE, RH>[])[i](value, ...ctx.sendArgs).send()
        );
      }
      return serialPromise;
    }
  });
};
