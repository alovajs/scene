import { AlovaMethodHandler, useWatcher, WatcherHookConfig } from 'alova';

export default function <S, E, R, T, RC, RE, RH>(
	handler: AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
	watchingStates: E[],
	config?: {
		enable: boolean | (() => boolean);
	} & WatcherHookConfig
) {
	return useWatcher(handler, watchingStates, config);
}
