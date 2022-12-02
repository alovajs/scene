import { AlovaMethodHandler, Method, useRequest } from 'alova';
import { BeforePushQueueHandler, FallbackHandler, PushedQueueHandler, SQRequestHookConfig } from '../../../typings';
import { isFn, runArgsHandler } from '../../helper';
import { PromiseCls, pushItem } from '../../helper/variables';
import { pushNewSilentMethod } from './silentQueue';

export default function <S, E, R, T, RC, RE, RH>(
	methodHandler: Method<S, E, R, T, RC, RE, RH> | AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
	config: SQRequestHookConfig<S, E, R, T, RC, RE, RH>
) {
	const { behavior = 'queue', queue, retry, interval, nextRound } = config || {};
	const fallbackHandlers: FallbackHandler[] = [];
	const beforePushQueueHandlers: BeforePushQueueHandler[] = [];
	const pushedQueueHandlers: PushedQueueHandler[] = [];

	const states = useRequest(methodHandler, {
		...config,

		// 中间件函数
		middleware: ({ method, sendArgs }, next) => {
			const behaviorFinal = isFn(behavior) ? behavior() : behavior;
			if (behaviorFinal !== 'static') {
				runArgsHandler(beforePushQueueHandlers, sendArgs);

				// 等待队列中的method执行完毕
				return new PromiseCls((resolveHandler, rejectHandler) => {
					pushNewSilentMethod(
						method,
						fallbackHandlers,
						retry,
						interval,
						nextRound,
						resolveHandler,
						rejectHandler,
						queue
					);
					runArgsHandler(pushedQueueHandlers, sendArgs);
				});
			}
			return next();
		}
	});

	return {
		...states,
		onFallback: (handler: FallbackHandler) => {
			pushItem(fallbackHandlers, handler);
		},
		onBeforePushQueue: (handler: BeforePushQueueHandler) => {
			pushItem(beforePushQueueHandlers, handler);
		},
		onPushedQueue: (handler: PushedQueueHandler) => {
			pushItem(pushedQueueHandlers, handler);
		}
	};
}
