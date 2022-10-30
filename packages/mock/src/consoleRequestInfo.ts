// 预定义的样式和固定文本
const mockLabel = 'Mock';
const mockLabelColor = '#64E8D6';
const realRequestLabel = 'Realtime';
const realRequestLabelColor = '#999999';
const labelStyle = (bgColor: string, borderColor = '') => {
	let style = `padding: 2px 6px; background: ${bgColor}; color: white;`;
	if (borderColor) {
		style += `border: solid 1px ${borderColor}`;
	}
	return style;
};
const titleStyle = () => `color: black; font-size: 12px; font-weight: bolder`;
const transform2TableData = (obj: AnyObject) => {
	const tableData = {} as AnyObject;
	for (const key in obj) {
		tableData[key] = { value: obj[key] };
	}
	return tableData;
};

type AnyObject = Record<string, any>;
// 打印请求信息，模拟数据请求专用
export default function (
	isMock: boolean,
	url: string,
	method: string,
	requestHeaders: AnyObject,
	queryStringParams: AnyObject,
	requestBody?: any,
	response?: any
) {
	console.groupCollapsed(
		`%c${isMock ? mockLabel : realRequestLabel}`,
		labelStyle(isMock ? mockLabelColor : realRequestLabelColor),
		url
	);

	// 请求方法
	console.log('%c[Method]', titleStyle(), method.toUpperCase());

	// 输出Request Headers
	console.log('%c[Request Headers]', titleStyle());
	console.table(transform2TableData(requestHeaders));

	// 输出Query String Parameters
	console.log('%c[Query String Parameters]', titleStyle());
	console.table(transform2TableData(queryStringParams));

	// 输出request body
	console.log('%c[Request Body]', titleStyle(), requestBody || '');

	// 输出response body
	if (isMock) {
		console.log('%c[Response Body]', titleStyle(), response || '');
	}
	console.groupEnd();
}
