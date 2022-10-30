import { AlovaRequestAdapter } from 'alova';

interface MockRequestInit<R, T, RC, RE, RH> {
	enable?: boolean;
	delay?: number;
	httpAdapter?: AlovaRequestAdapter<R, T, RC, RE, RH>;
	mockRequestLogger?: boolean; // 是否打印模拟请求信息，便于调试
	onMockResponse?: (data: any) => RE;
}

type Args = Record<string, string>;
type MockFunction = (args: { query: Args; params: Args; data: Args }) => any;
type Mock = Record<string, MockFunction | string | number | Record<string, any> | any[]>;

interface MockWrapper {
	enable: boolean;
	data: Mock;
}

export declare function createAlovaMockAdapter<RC, RE, RH>(
	mockWrapper: MockWrapper[],
	options?: MockRequestInit<any, any, RC, RE, RH>
): AlovaRequestAdapter<any, any, RC, RE, RH>;
export declare function defineMock(mock: Mock, enable?: boolean): MockWrapper;
