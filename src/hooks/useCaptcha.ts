import { T$, Tupd$, T_$, T_exp$ } from '@/framework/type';
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
  _exp$: T_exp$
) => {
  const { initialCountdown } = config;
  assert(initialCountdown === undefinedValue || initialCountdown > 0, 'initialCountdown must be greater than 0');

  const countdown = $(0);
  const requestReturned = useRequest(handler, {
    ...config,
    immediate: falseValue
  });

  let timer: NodeJS.Timer;
  return {
    ...requestReturned,
    send: (...args: any[]) =>
      newInstance(PromiseCls, (resolve, reject) => {
        if (_$(countdown) <= 0) {
          requestReturned
            .send(...args)
            .then(result => {
              upd$(countdown, config.initialCountdown || 60);
              timer = setInterval(() => {
                upd$(countdown, val => val - 1);
                if (_$(countdown) <= 0) {
                  clearInterval(timer);
                }
              }, 1000);
              resolve(result);
            })
            .catch(reason => reject(reason));
        } else {
          reject(new Error(buildErrorMsg(hookPrefix, 'the countdown is not over yet')));
        }
      }),
    countdown: _exp$(countdown)
  };
};
