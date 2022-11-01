import { AlovaRequestAdapterConfig } from 'alova';
import { Mock, MockRequestInit } from '../typings';
import consoleRequestInfo from './consoleRequestInfo';

const defaultOnMockResponse = (data: any) => new Response(JSON.stringify(data));
type MockRequestInitWithMock<R, T, RC, RE, RH> = MockRequestInit<R, T, RC, RE, RH> & { mock: Mock };
export default function MockRequest<RC, RE, RH>(
	{
		// 此enable为总开关
		enable = true,
		delay = 2000,
		httpAdapter,
		mockRequestLogger = true,
		mock,
		onMockResponse = defaultOnMockResponse as (data: any) => any
	}: MockRequestInitWithMock<any, any, RC, RE, RH> = { mock: {} }
) {
	return (adapterConfig: AlovaRequestAdapterConfig<any, any, RC, RH>) => {
		const anchor = document.createElement('a');
		const { url, data } = adapterConfig;
		anchor.href = url;

		// 获取当前请求的模拟数据集合，如果enable为false，则不返回模拟数据
		mock = (enable && mock) || {};

		// 用正则表达式解析search参数为对象
		const searchParams = new URLSearchParams(anchor.search);
		const query: Record<string, string> = {};
		for (const [key, value] of searchParams) {
			query[key] = value;
		}

		const params: Record<string, string> = {};
		const pathnameSplited = anchor.pathname.split('/');
		const foundMockDataKeys = Object.keys(mock).filter(key => {
			// 如果key的前面是-，表示忽略此模拟数据，此时也返回false
			if (key.startsWith('-')) {
				return false;
			}

			// 匹配请求方法
			let method = 'GET';
			key = key.replace(/^\[(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|TRACE|CONNECT)\]/i, (_, $1) => {
				method = $1.toUpperCase();
				return '';
			});

			// 请求方法不匹配，返回false
			if (method !== adapterConfig.method.toUpperCase()) {
				return false;
			}

			const keySplited = key.split('/');
			if (keySplited.length !== pathnameSplited.length) {
				return false;
			}

			// 通过相同下标匹配来判断是否匹配该路径
			// 如果遇到通配符则直接通过
			for (const i in keySplited) {
				const keySplitedItem = keySplited[i];
				const matchedParamKey = (keySplitedItem.match(/^\{(.*)\}$/) || ['', ''])[1];
				if (!matchedParamKey) {
					if (keySplitedItem !== pathnameSplited[i]) {
						return false;
					}
				} else {
					params[matchedParamKey] = pathnameSplited[i];
				}
			}
			return true;
		});

		// 如果匹配了多个，则优先使用没有通配符的，如果都有通配符则使用第一个匹配到的
		let finalKey = foundMockDataKeys.find(key => !/\{.*\}/.test(key));
		finalKey = finalKey || foundMockDataKeys.shift();
		const mockDataRaw = finalKey ? mock[finalKey] : undefined;

		// 如果没有匹配到模拟数据，则表示要发起请求使用httpAdapter来发送请求
		if (mockDataRaw === undefined) {
			if (httpAdapter) {
				mockRequestLogger && consoleRequestInfo(false, url, adapterConfig.method, adapterConfig.headers, query);
				return httpAdapter(adapterConfig);
			} else {
				throw new Error(`could not find the httpAdapter which send request.\n[url]${url}`);
			}
		}
		const responseData =
			typeof mockDataRaw === 'function'
				? mockDataRaw({
						query,
						params,
						data
				  })
				: mockDataRaw;

		let timer: NodeJS.Timeout;
		return {
			response: () =>
				new Promise<RE>(
					(resolve, reject) =>
						(timer = setTimeout(() => {
							if (responseData) {
								// 打印模拟数据请求信息
								mockRequestLogger &&
									consoleRequestInfo(true, url, adapterConfig.method, adapterConfig.headers, query, data, responseData);
								resolve(onMockResponse(responseData));
							} else {
								reject(new Error('404 api not found'));
							}
						}, delay))
				),
			headers: () => Promise.resolve<Headers>(new Headers()),
			abort: () => {
				clearTimeout(timer);
			}
		};
	};
}
