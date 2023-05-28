import { T$, Tupd$, TuseFlag$, T_$, T_exp$ } from '@/framework/type';
import { buildErrorMsg, createAssert, newInstance } from '@/helper';
import { falseValue, PromiseCls, undefinedValue } from '@/helper/variables';
import { AlovaMethodHandler, Method, useRequest } from 'alova';
import { CaptchaHookConfig } from '~/typings/general';

const hookPrefix = 'useCaptcha';
const assert = createAssert(hookPrefix);
export default <S, E, R, T, RC, RE, RH>(
  handler: Method<S, E, R, T, RC, RE, RH> | AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
  config: CaptchaHookConfig<S, E, R, T, RC, RE, RH>,
  $: T$,
  upd$: Tupd$,
  _$: T_$,
  _exp$: T_exp$,
  useFlag$: TuseFlag$
) => {
  const { initialCountdown, middleware } = config;
  assert(initialCountdown === undefinedValue || initialCountdown > 0, 'initialCountdown must be greater than 0');

  const countdown = $(0);
  const requestReturned = useRequest(handler, {
    ...config,
    immediate: falseValue,
    middleware: middleware ? (ctx, next) => middleware({ ...ctx, send }, next) : undefinedValue
  });

  const timer = useFlag$(undefinedValue as NodeJS.Timeout | undefined);
  const send = (...args: any[]) =>
    newInstance(PromiseCls, (resolve, reject) => {
      if (_$(countdown) <= 0) {
        requestReturned
          .send(...args)
          .then(result => {
            upd$(countdown, config.initialCountdown || 60);
            timer.v = setInterval(() => {
              upd$(countdown, val => val - 1);
              if (_$(countdown) <= 0) {
                clearInterval(timer.v);
              }
            }, 1000);
            resolve(result);
          })
          .catch(reason => reject(reason));
      } else {
        reject(new Error(buildErrorMsg(hookPrefix, 'the countdown is not over yet')));
      }
    });
  return {
    ...requestReturned,
    send,
    countdown: _exp$(countdown)
  };
};
