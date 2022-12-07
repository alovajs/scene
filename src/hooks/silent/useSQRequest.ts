import { AlovaMethodHandler, Method, useRequest } from 'alova';
import { BeforePushQueueHandler, FallbackHandler, PushedQueueHandler, SQRequestHookConfig } from '../../../typings';
import { forEach, isFn, objectKeys, promiseResolve, promiseThen, pushItem, runArgsHandler } from '../../helper';
import { PromiseCls } from '../../helper/variables';
import { MethodHandler } from './SilentMethod';
import { pushNewSilentMethod2Queue, silentMethodQueueMap } from './silentQueue';
import createVirtualTag from './virtualTag/createVirtualTag';

export default function <S, E, R, T, RC, RE, RH>(
	handler: Method<S, E, R, T, RC, RE, RH> | AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
	config: SQRequestHookConfig<S, E, R, T, RC, RE, RH>
) {
	const { behavior = 'queue', queue, retry, timeout, nextRound } = config || {};
	const fallbackHandlers: FallbackHandler[] = [];
	const beforePushQueueHandlers: BeforePushQueueHandler[] = [];
	const pushedQueueHandlers: PushedQueueHandler[] = [];

	let collectedMethodHandler: MethodHandler<any, any, any, any, any, any, any> | undefined;
	let handlerArgs: any[] | undefined;
	const states = useRequest(
		(...args: any[]) => {
			const methodHandler = isFn(handler) ? handler : () => handler;
			const methodInstance = methodHandler(...args);
			collectedMethodHandler = methodHandler;
			handlerArgs = args;
			return methodInstance;
		},
		{
			...config,
			// 中间件函数
			middleware: ({ method, sendArgs, statesUpdate, decorateSuccess }, next) => {
				// 因为behavior返回值可能会变化，因此每次请求都应该调用它重新获取返回值
				const behaviorFinally = isFn(behavior) ? behavior() : behavior;
				if (behaviorFinally !== 'static') {
					runArgsHandler(beforePushQueueHandlers, ...sendArgs);

					// 等待队列中的method执行完毕
					const queueResolvePromise = new PromiseCls((resolveHandler, rejectHandler) => {
						pushNewSilentMethod2Queue(
							method,
							behaviorFinally,
							fallbackHandlers,
							retry,
							timeout,
							nextRound,
							resolveHandler,
							rejectHandler,
							collectedMethodHandler,
							handlerArgs,
							queue
						);
						runArgsHandler(pushedQueueHandlers, ...sendArgs);
					});
					if (behaviorFinally === 'queue') {
						statesUpdate({ loading: true });
						return queueResolvePromise;
					}
					// silent模式下，先立即返回虚拟响应值，然后当真实数据返回时再更新
					const virtualTagLocked = { v: false };
					decorateSuccess((handler, args, index, length) => {
						handler(args.shift(), ...args);
						// 所有成功回调执行完后再锁定
						if (index === length - 1) {
							virtualTagLocked.v = true;
						}
					});
					promiseThen(queueResolvePromise, realResponse => {
						statesUpdate({
							data: realResponse
						});

						// TODO: 替换队列中后面方法实例中的虚拟标签为真实数据
						const responseDataReplacement = {} as Record<string, any>;

						// TODO: 将虚拟标签找出来，并依次替换
						forEach(objectKeys(silentMethodQueueMap), queueName => {
							const currentQueue = silentMethodQueueMap[queueName];
							forEach(currentQueue, silentMethodItem => {
								const handlerArgs = silentMethodItem.handlerArgs || [];
								forEach(handlerArgs, (arg, i) => {
									if (responseDataReplacement[arg]) {
										handlerArgs[i] = responseDataReplacement[arg];
									}
								});
								// 重新生成一个method实例并替换
								if (silentMethodItem.methodHandler) {
									silentMethodItem.entity = silentMethodItem.methodHandler(...handlerArgs);
								}
							});
						});
					});
					return promiseResolve(createVirtualTag(virtualTagLocked));
				}
				return next();
			}
		}
	);

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
