import { AlovaMethodHandler, AlovaMiddleware, Method } from 'alova';
import { BeforePushQueueHandler, FallbackHandler, PushedQueueHandler, SQHookConfig } from '../../../typings';
import { GeneralFn, isFn, len, promiseResolve, promiseThen, pushItem, runArgsHandler, walkObject } from '../../helper';
import { falseValue, PromiseCls, trueValue, undefinedValue } from '../../helper/variables';
import createSQEvent from './createSQEvent';
import { setVtagIdCollectBasket, vtagIdCollectBasket } from './globalVariables';
import { MethodHandler, SilentMethod } from './SilentMethod';
import { pushNewSilentMethod2Queue } from './silentQueue';
import createVirtualResponse from './virtualTag/createVirtualResponse';
import stringifyVtag from './virtualTag/stringifyVtag';
import { regVirtualTag } from './virtualTag/variables';

/**
 * 全局的silentMethod实例，它将在第一个成功事件触发前到最后一个成功事件触发后有值（同步时段）
 * 通过此方式让onSuccess中的updateStateEffect内获得当前的silentMethod实例
 */
export let currentSilentMethod: SilentMethod | undefined = undefinedValue;

/**
 * 创建SilentQueue中间件函数
 * @param config 配置对象
 * @returns 中间件函数
 */
export default <S, E, R, T, RC, RE, RH>(
	handler: Method<S, E, R, T, RC, RE, RH> | AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
	config?: SQHookConfig<S, E, R, T, RC, RE, RH>
) => {
	const { behavior = 'queue', queue, retry, timeout, nextRound } = config || {};
	const fallbackHandlers: FallbackHandler[] = [];
	const beforePushQueueHandlers: BeforePushQueueHandler[] = [];
	const pushedQueueHandlers: PushedQueueHandler[] = [];
	let collectedMethodHandler: MethodHandler<any, any, any, any, any, any, any> | undefined;
	let handlerArgs: any[] | undefined;

	/**
	 * method实例创建函数
	 * @param {any[]} args 调用send传入的函数
	 * @returns {Method}
	 */
	const createMethod = (...args: any[]) => {
		setVtagIdCollectBasket([]);
		handlerArgs = args;
		const methodHandler = isFn(handler) ? handler : () => handler;
		const methodInstance = methodHandler(...args);
		collectedMethodHandler = methodHandler;
		return methodInstance;
	};

	/**
	 * 中间件函数
	 * @param context 请求上下文，包含请求相关的值
	 * @param next 继续执行函数
	 * @returns {Promise}
	 */
	const middleware: AlovaMiddleware<S, E, R, T, RC, RE, RH> = (
		{ method, sendArgs, statesUpdate, decorateSuccess, decorateError, decorateComplete, config },
		next
	) => {
		// 因为behavior返回值可能会变化，因此每次请求都应该调用它重新获取返回值
		const behaviorFinally = isFn(behavior) ? behavior() : behavior;
		const { silentDefaultResponse, vTagCaptured } = config;

		// 如果设置了vTagCaptured，则先判断是否带有method
		let hasVirtualTag = falseValue;
		if (isFn(vTagCaptured)) {
			walkObject(method, value => {
				const virtualTagId = stringifyVtag(value);
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

		// 设置事件回调装饰器
		const virtualTagLocked = { v: falseValue };
		let silentMethodInstance: any;

		// 将响应对应的事件实例创建函数暂存到createFinishedEvent中，在complete事件触发时直接调用此函数即可获得对应状态的事件实例
		let createFinishedEvent: GeneralFn | undefined = undefinedValue;
		decorateSuccess((handler, args, index, length) => {
			currentSilentMethod = silentMethodInstance;
			createFinishedEvent =
				createFinishedEvent ||
				(() => createSQEvent(3, behaviorFinally, method, silentMethodInstance, undefinedValue, sendArgs, args[0]));
			handler(createFinishedEvent() as any);

			// 所有成功回调执行完后再锁定虚拟标签，锁定后虚拟响应数据内不能再访问任意层级
			// 锁定操作只在silent模式下，用于锁定虚拟标签的生成操作
			if (index === length - 1) {
				virtualTagLocked.v = trueValue;
				currentSilentMethod = undefinedValue;
			}
		});
		decorateError((handler, args) => {
			createFinishedEvent =
				createFinishedEvent ||
				(() =>
					createSQEvent(
						4,
						behaviorFinally,
						method,
						silentMethodInstance,
						undefinedValue,
						sendArgs,
						undefinedValue,
						undefinedValue,
						args[0]
					));
			handler(createFinishedEvent() as any);
		});
		decorateComplete(handler => {
			handler(createFinishedEvent?.() as any);
		});

		if (behaviorFinally !== 'static') {
			// 等待队列中的method执行完毕
			const queueResolvePromise = new PromiseCls((resolveHandler, rejectHandler) => {
				silentMethodInstance = new SilentMethod(
					method,
					len(fallbackHandlers) <= 0 && behavior === 'silent',
					behaviorFinally,
					undefinedValue,
					retry,
					timeout,
					nextRound,
					fallbackHandlers,
					resolveHandler,
					rejectHandler,
					collectedMethodHandler,
					handlerArgs,
					vtagIdCollectBasket
				);
				const createPushEvent = () =>
					createSQEvent(2, behaviorFinally, method, silentMethodInstance, undefinedValue, sendArgs);

				// 将silentMethod放入队列并持久化
				pushNewSilentMethod2Queue(silentMethodInstance, queue, () => {
					// 执行放入队列前回调
					runArgsHandler(beforePushQueueHandlers, createPushEvent());
				});
				// 置空临时收集变量
				setVtagIdCollectBasket((collectedMethodHandler = handlerArgs = undefinedValue));

				// 执行放入队列后回调
				runArgsHandler(pushedQueueHandlers, createPushEvent());
			});
			if (behaviorFinally === 'queue') {
				return queueResolvePromise;
			}

			// 在silent模式下创建虚拟响应数据，虚拟响应数据可生成任意的虚拟标签
			const virtualResponse = ((silentMethodInstance as SilentMethod).virtualResponse = createVirtualResponse(
				isFn(silentDefaultResponse) ? silentDefaultResponse() : {},
				virtualTagLocked
			));
			promiseThen(queueResolvePromise, realResponse => {
				// 获取到真实数据后更新过去
				statesUpdate({
					data: realResponse
				});
			});

			// silent模式下，先立即返回虚拟响应值，然后当真实数据返回时再更新
			return promiseResolve(virtualResponse);
		}
		return next();
	};

	return {
		c: createMethod,
		m: middleware,

		// 事件绑定函数
		b: {
			/**
			 * 绑定回退事件
			 * @param handler 回退事件回调
			 */
			onFallback: (handler: FallbackHandler) => {
				pushItem(fallbackHandlers, handler);
			},

			/**
			 * 绑定入队列前事件
			 * @param handler 入队列前的事件回调
			 */
			onBeforePushQueue: (handler: BeforePushQueueHandler) => {
				pushItem(beforePushQueueHandlers, handler);
			},

			/**
			 * 绑定入队列后事件
			 * @param handler 入队列后的事件回调
			 */
			onPushedQueue: (handler: PushedQueueHandler) => {
				pushItem(pushedQueueHandlers, handler);
			}
		}
	};
};
