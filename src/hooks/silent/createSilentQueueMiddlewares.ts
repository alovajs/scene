import { AlovaMethodHandler, AlovaMiddleware, Method } from 'alova';
import { BeforePushQueueHandler, FallbackHandler, PushedQueueHandler, SQHookConfig } from '../../../typings';
import { isFn, promiseResolve, promiseThen, pushItem, runArgsHandler, walkObject } from '../../helper';
import { falseValue, PromiseCls, trueValue, undefinedValue } from '../../helper/variables';
import { MethodHandler } from './SilentMethod';
import { pushNewSilentMethod2Queue } from './silentQueue';
import {
	parseResponseWithVirtualResponse,
	regVirtualTag,
	replaceVirtualMethod,
	stringVirtualTag
} from './virtualTag/auxiliary';
import createVirtualTag from './virtualTag/createVirtualTag';

/**
 * 创建SilentQueue中间件函数
 * @param config 配置对象
 * @returns 中间件函数
 */
export let vtagIdCollectBasket: string[] | undefined;
export default <S, E, R, T, RC, RE, RH>(
	handler: Method<S, E, R, T, RC, RE, RH> | AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
	config?: SQHookConfig<S, E, R, T, RC, RE, RH>
) => {
	const fallbackHandlers: FallbackHandler[] = [];
	const beforePushQueueHandlers: BeforePushQueueHandler[] = [];
	const pushedQueueHandlers: PushedQueueHandler[] = [];
	let collectedMethodHandler: MethodHandler<any, any, any, any, any, any, any> | undefined;
	let handlerArgs: any[] | undefined;

	// method实例创建函数
	const createMethod = (...args: any[]) => {
		vtagIdCollectBasket = [];
		handlerArgs = args;
		const methodHandler = isFn(handler) ? handler : () => handler;
		const methodInstance = methodHandler(...args);
		collectedMethodHandler = methodHandler;
		return methodInstance;
	};

	const { behavior = 'queue', queue, retry, timeout, nextRound } = config || {};
	// 中间件函数
	const middleware: AlovaMiddleware<S, E, R, T, RC, RE, RH> = (
		{ method, sendArgs, statesUpdate, decorateSuccess, config },
		next
	) => {
		// 因为behavior返回值可能会变化，因此每次请求都应该调用它重新获取返回值
		const behaviorFinally = isFn(behavior) ? behavior() : behavior;
		const { silentDefaultResponse, vTagCaptured } = config;

		// 如果设置了vTagCaptured，则先判断是否带有method
		let hasVirtualTag = falseValue;
		if (isFn(vTagCaptured)) {
			walkObject(method, value => {
				const virtualTagId = stringVirtualTag(value);
				if (!hasVirtualTag && (virtualTagId || regVirtualTag.test(value))) {
					hasVirtualTag = trueValue;
				}
				return value;
			});
			// 如果vTagCaptured有返回数据，则使用它作为响应数据，否则继续请求
			const customResponse = hasVirtualTag ? vTagCaptured(method) : undefinedValue;
			if (customResponse !== undefinedValue) {
				return promiseResolve(customResponse);
			}
		}

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
					vtagIdCollectBasket,
					queue
				);
				vtagIdCollectBasket = collectedMethodHandler = handlerArgs = undefinedValue; // 置空临时收集变量
				runArgsHandler(pushedQueueHandlers, ...sendArgs);
			});
			if (behaviorFinally === 'queue') {
				statesUpdate({ loading: trueValue });
				return queueResolvePromise;
			}
			const virtualTagLocked = { v: falseValue };
			const successHandlers = [] as ((data: R) => void)[];
			decorateSuccess((handler, args, index, length) => {
				handler(args.shift(), ...args);
				// 记录成功回调，让它在成功响应后再次调用成功回调
				pushItem(successHandlers, data => handler(data, ...args));
				// 所有成功回调执行完后再锁定虚拟标签，锁定后虚拟响应数据内不能再访问任意层级
				if (index === length - 1) {
					virtualTagLocked.v = trueValue;
				}
			});

			const vTagDefaults = promiseResolve(
				createVirtualTag(virtualTagLocked, isFn(silentDefaultResponse) ? silentDefaultResponse() : {})
			);
			promiseThen(queueResolvePromise, realResponse => {
				// 获取到真实数据后更新过去
				statesUpdate({
					data: realResponse
				});

				// 替换队列中后面方法实例中的虚拟标签为真实数据
				const virtualTagReplacedResponseMap = parseResponseWithVirtualResponse(realResponse, vTagDefaults);
				// 将虚拟标签找出来，并依次替换
				replaceVirtualMethod(virtualTagReplacedResponseMap);

				// 再次调用成功回调
				runArgsHandler(successHandlers, realResponse);
			});

			// silent模式下，先立即返回虚拟响应值，然后当真实数据返回时再更新
			return vTagDefaults;
		}
		return next();
	};

	return {
		c: createMethod,
		m: middleware,
		b: {
			onFallback: (handler: FallbackHandler) => {
				pushItem(fallbackHandlers, handler);
			},
			onBeforePushQueue: (handler: BeforePushQueueHandler) => {
				pushItem(beforePushQueueHandlers, handler);
			},
			onPushedQueue: (handler: PushedQueueHandler) => {
				pushItem(pushedQueueHandlers, handler);
			}
		}
	};
};
