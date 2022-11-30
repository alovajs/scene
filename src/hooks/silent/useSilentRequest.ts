import { AlovaMethodHandler, Method, RequestHookConfig, useRequest } from 'alova';

export default function <S, E, R, T, RC, RE, RH>(
	methodHandler: Method<S, E, R, T, RC, RE, RH> | AlovaMethodHandler<S, E, R, T, RC, RE, RH>,
	config?: {
		enable?: boolean | (() => boolean);
	} & RequestHookConfig
) {
	return useRequest(methodHandler, config);
}
