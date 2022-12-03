import { AlovaMethodHandler, Method, useRequest } from 'alova';
import { BeforePushQueueHandler, FallbackHandler, PushedQueueHandler, SQRequestHookConfig } from '../../../typings';
import { isFn, promiseResolve, promiseThen, pushItem, runArgsHandler } from '../../helper';
import { PromiseCls } from '../../helper/variables';
import { pushNewSilentMethod } from './silentQueue';
import { createVirtualResponse } from './virtualResponse';

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
		middleware: ({ method, sendArgs, statesUpdate, frontStates }, next) => {
			const behaviorFinal = isFn(behavior) ? behavior() : behavior;
			if (behaviorFinal !== 'static') {
				runArgsHandler(beforePushQueueHandlers, sendArgs);

				// 等待队列中的method执行完毕
				const queueResolvePromise = new PromiseCls((resolveHandler, rejectHandler) => {
					pushNewSilentMethod(
						method,
						behaviorFinal,
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
				if (behaviorFinal === 'queue') {
					statesUpdate({ loading: true });
					return queueResolvePromise;
				}
				// silent模式下，先立即返回虚拟响应值，然后当真实数据返回时再更新
				promiseThen(queueResolvePromise, realResponse => {
					statesUpdate({
						data: realResponse
					});

					// TODO: 替换队列中后面方法实例中的虚拟标签为真实数据
				});
				return promiseResolve(createVirtualResponse());
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
