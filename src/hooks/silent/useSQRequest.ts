import { AlovaMethodHandler, Method, useRequest } from 'alova';
import { SQRequestHookConfig } from '../../../typings';
import createSilentQueueMiddlewares from './createSilentQueueMiddlewares';

export default function <S, E, R, T, RC, RE, RH>(
  handler: Method<S, E, R, T, RC, RE, RH> | AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
  config?: SQRequestHookConfig<S, E, R, T, RC, RE, RH>
) {
  const { c: methodCreateHandler, m: middleware, b: binders } = createSilentQueueMiddlewares(handler, config);
  const states = useRequest(methodCreateHandler, {
    ...config,
    middleware
  });
  return {
    ...states,
    ...binders
  };
}
