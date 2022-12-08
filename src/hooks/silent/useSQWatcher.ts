import { AlovaMethodHandler, useWatcher } from 'alova';
import { SQWatcherHookConfig } from '../../../typings';
import createSilentQueueMiddlewares from './createSilentQueueMiddlewares';

export default function <S, E, R, T, RC, RE, RH>(
	handler: AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
	watchingStates: E[],
	config?: SQWatcherHookConfig<S, E, R, T, RC, RE, RH>
) {
	const { c: methodCreateHandler, m: middleware, b: binders } = createSilentQueueMiddlewares(handler, config);
	const states = useWatcher(methodCreateHandler, watchingStates, {
		...config,
		middleware
	});
	return {
		...states,
		...binders
	};
}
