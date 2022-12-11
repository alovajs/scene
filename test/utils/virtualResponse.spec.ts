import {
	globalVirtualResponseLock,
	setVtagIdCollectBasket,
	vtagIdCollectBasket
} from '../../src/hooks/silent/globalVariables';
import createVirtualResponse from '../../src/hooks/silent/virtualTag/createVirtualResponse';
import Null from '../../src/hooks/silent/virtualTag/Null';
import Undefined from '../../src/hooks/silent/virtualTag/Undefined';
import valueOf from '../../src/hooks/silent/virtualTag/valueOf';
import { regVirtualTag } from '../../src/hooks/silent/virtualTag/variables';
import vtagStringify from '../../src/hooks/silent/virtualTag/vtagStringify';

beforeEach(() => (globalVirtualResponseLock.v = false));

// 虚拟响应测试
describe('virtual response', () => {
	test('undefined wrapper', () => {
		const undef = new Undefined();
		expect((undef as any) + 1).toBeNaN();
		expect((undef as any) - 1).toBeNaN();
		expect((undef as any) | 1).toBe(1);
		expect((undef as any) & 1).toBe(0);
		expect((undef as any) > 0).toBeFalsy();
		expect((undef as any) < 0).toBeFalsy();
		expect((undef as any) == 0).toBeFalsy();
		expect((undef as any) >= 0).toBeFalsy();
		expect((undef as any) <= 0).toBeFalsy();

		let defProxy = createVirtualResponse(undef);
		globalVirtualResponseLock.v = true;
		expect(() => {
			defProxy.toString;
		}).toThrow();
	});

	test('null wrapper', () => {
		const nil = new Null();
		expect((nil as any) + 1).toBe(1);
		expect((nil as any) - 1).toBe(-1);
		expect((nil as any) | 1).toBe(1);
		expect((nil as any) & 1).toBe(0);
		expect((nil as any) > 0).toBeFalsy();
		expect((nil as any) < 0).toBeFalsy();
		expect((nil as any) == 0).toBeFalsy();
		expect((nil as any) >= 0).toBeTruthy();
		expect((nil as any) <= 0).toBeTruthy();

		let defProxy = createVirtualResponse(nil);
		globalVirtualResponseLock.v = true;
		expect(() => {
			defProxy.toString;
		}).toThrow();
	});

	test('create virtual response with Undefined instance', () => {
		const virtualResponse = createVirtualResponse(new Undefined());

		const a = virtualResponse.a;
		const b1 = virtualResponse.b.b1;
		const c0 = virtualResponse.c[0];
		globalVirtualResponseLock.v = true;
		expect(a).toBeInstanceOf(Undefined);
		expect(b1).toBeInstanceOf(Undefined);
		expect(c0).toBeInstanceOf(Undefined);
		expect(virtualResponse).toBeInstanceOf(Undefined);
		expect(() => {
			virtualResponse.a;
		}).toThrow();
		expect(() => {
			virtualResponse.b.b1;
		}).toThrow();
		expect(() => {
			virtualResponse.c;
		}).toThrow();
	});

	test('create virtual response with empty object', () => {
		const virtualResponse = createVirtualResponse({});
		const a = virtualResponse.a;
		const b1 = virtualResponse.b.b1;
		const c0 = virtualResponse.c[0];
		globalVirtualResponseLock.v = true;
		expect(a).toBeInstanceOf(Undefined);
		expect(b1).toBeInstanceOf(Undefined);
		expect(c0).toBeInstanceOf(Undefined);
		expect(virtualResponse.a).toBeUndefined();
		expect(() => {
			virtualResponse.a.toString;
		}).toThrow();
		expect(() => {
			virtualResponse.b.b1;
		}).toThrow();
		expect(() => {
			virtualResponse.c[0];
		}).toThrow();
		expect(() => {
			virtualResponse.d.toString;
		}).toThrow();
	});

	test('create virtual response with object', () => {
		const virtualResponse = createVirtualResponse({
			a: 1,
			b: 'bb',
			c: [4, 5, 6]
		});

		const a = virtualResponse.a;
		const b = virtualResponse.b;
		const c0 = virtualResponse.c[0];
		globalVirtualResponseLock.v = true;
		setVtagIdCollectBasket({});
		expect(a).toBeInstanceOf(Number);
		expect(a.toFixed(1)).toBe('1.0');
		expect(a.valueOf()).toBe(1);
		expect(a.toString()).toBe('1');
		expect(a + 100).toBe(101);

		expect(b).toBeInstanceOf(String);
		expect(b.valueOf()).toBe('bb');
		// b具有和string一样的特性
		expect(b.replace('bb', 'ccc')).toBe('ccc');
		expect(b + 111).toBe('bb111');

		expect(c0).toBeInstanceOf(Number);
		expect(c0.valueOf()).toBe(4);
		expect(virtualResponse.a.valueOf()).toBe(1);
		expect(virtualResponse.b.valueOf()).toBe('bb');
		expect(virtualResponse.c0).toBeUndefined(); // 锁定后，不能再任意访问虚拟响应了
		const c0Primitive = virtualResponse.c[0];
		// 锁定后，当访问虚拟标签时将会返回其原始值
		expect(c0Primitive).toBe(4);
		expect(typeof c0Primitive).toBe('number');
		expect(() => {
			virtualResponse.b1.toString;
		}).toThrow();
		expect(() => {
			virtualResponse.d.toString;
		}).toThrow();
		expect(Object.keys(vtagIdCollectBasket || {})).toHaveLength(4);
		setVtagIdCollectBasket(undefined);
	});

	test('create virtual response with primitive type', () => {
		let virtualResponse = createVirtualResponse(100);
		let a = virtualResponse.a;
		let b = virtualResponse.b;
		globalVirtualResponseLock.v = true;
		setVtagIdCollectBasket({});
		expect(a).toBeInstanceOf(Undefined);
		expect(b).toBeInstanceOf(Undefined);
		expect(virtualResponse.a).toBeUndefined();
		expect(virtualResponse.c).toBeUndefined();

		globalVirtualResponseLock.v = false;
		virtualResponse = createVirtualResponse(true);
		a = virtualResponse.a;
		b = virtualResponse.b;
		globalVirtualResponseLock.v = true;
		setVtagIdCollectBasket({});
		expect(a).toBeInstanceOf(Undefined);
		expect(b).toBeInstanceOf(Undefined);
		expect(virtualResponse.a).toBeUndefined();
		expect(virtualResponse.c).toBeUndefined();
	});

	test('should return primitive type when call valueOf that custom defined', () => {
		const virtualResponse = createVirtualResponse({
			a: 1,
			b: 'bb',
			c: [4, 5, 6],
			d: null
		});

		const a = virtualResponse.a;
		const b = virtualResponse.b;
		const c = virtualResponse.c;
		const d = virtualResponse.d;
		const f = virtualResponse.e.f;
		globalVirtualResponseLock.v = true;
		expect(valueOf(a)).toBe(1);
		expect(typeof valueOf(a)).toBe('number');
		expect(valueOf(b)).toBe('bb');
		expect(valueOf(c)).toEqual([4, 5, 6]);
		expect(typeof valueOf(b)).toBe('string');
		expect(valueOf(d)).toBeNull();
		expect(valueOf(f)).toBeUndefined();

		// vtagStringify测试
		expect(vtagStringify(a)).toMatch(regVirtualTag);
		expect(vtagStringify(b)).toMatch(regVirtualTag);
		expect(vtagStringify(virtualResponse.a)).toBe(1);
	});
});
