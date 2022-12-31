import {
  globalVirtualResponseLock,
  setVDataIdCollectBasket,
  vDataIdCollectBasket
} from '../../src/hooks/silent/globalVariables';
import createVirtualResponse from '../../src/hooks/silent/virtualResponse/createVirtualResponse';
import { symbolOriginalValue, symbolVDataId } from '../../src/hooks/silent/virtualResponse/variables';
import VData from '../../src/hooks/silent/virtualResponse/VData';

beforeEach(() => (globalVirtualResponseLock.v = 0));
// 虚拟响应测试
describe('virtual response', () => {
  test('undefined virtual data', () => {
    const undef = createVirtualResponse(undefined);
    globalVirtualResponseLock.v = 2;
    setVDataIdCollectBasket({});
    expect(undef + 1).toBeNaN();
    expect(undef - 1).toBeNaN();
    expect(undef | 1).toBe(1);
    expect(undef & 1).toBe(0);
    expect(undef > 0).toBeFalsy();
    expect(undef < 0).toBeFalsy();
    expect(undef == 0).toBeFalsy();
    expect(undef >= 0).toBeFalsy();
    expect(undef <= 0).toBeFalsy();

    expect(() => {
      undef.toString;
    }).toThrow();
    expect(Object.keys(vDataIdCollectBasket || {})).toHaveLength(1);
    setVDataIdCollectBasket(undefined);
  });

  test('null virtual data', () => {
    const nil = createVirtualResponse(null);
    globalVirtualResponseLock.v = 2;
    setVDataIdCollectBasket({});
    expect(nil + 1).toBe(1);
    expect(nil - 1).toBe(-1);
    expect(nil | 1).toBe(1);
    expect(nil & 1).toBe(0);
    expect(nil > 0).toBeFalsy();
    expect(nil < 0).toBeFalsy();
    expect(nil == 0).toBeFalsy();
    expect(nil >= 0).toBeTruthy();
    expect(nil <= 0).toBeTruthy();

    expect(() => {
      nil.toString;
    }).toThrow();
    expect(Object.keys(vDataIdCollectBasket || {})).toHaveLength(1);
    setVDataIdCollectBasket(undefined);
  });

  test('create virtual response with Undefined instance', () => {
    const virtualResponse = createVirtualResponse(undefined);
    const a = virtualResponse.a;
    const b1 = virtualResponse.b.b1;
    const c0 = virtualResponse.c[0];
    globalVirtualResponseLock.v = 2;
    expect(a).toBeInstanceOf(VData);
    expect(a[symbolOriginalValue]).toBeUndefined();
    expect(b1[symbolOriginalValue]).toBeUndefined();
    expect(c0[symbolOriginalValue]).toBeUndefined();
    expect(virtualResponse[symbolOriginalValue]).toBeUndefined();
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
    globalVirtualResponseLock.v = 2;
    expect(a[symbolOriginalValue]).toBeUndefined();
    expect(b1[symbolOriginalValue]).toBeUndefined();
    expect(b1).toBeInstanceOf(VData);
    expect(c0[symbolOriginalValue]).toBeUndefined();
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
    const c = virtualResponse.c;

    globalVirtualResponseLock.v = 1;
    expect(virtualResponse.a[symbolOriginalValue]).toBe(1);
    expect(virtualResponse.a[symbolVDataId]).toBe(a[symbolVDataId]);
    expect(virtualResponse.d).toBeUndefined();

    globalVirtualResponseLock.v = 2;
    setVDataIdCollectBasket({});
    expect(a[symbolOriginalValue]).toBe(1);
    expect(a.toFixed(1)).toBe('1.0');
    expect(a.valueOf()).toBe(1);
    expect(a.toString()).toBe('1');
    expect(a + 100).toBe(101);

    expect(b[symbolOriginalValue]).toBe('bb');
    expect(b.valueOf()).toBe('bb');
    // b具有和string一样的特性
    expect(b.replace('bb', 'ccc')).toBe('ccc');
    expect(b + 111).toBe('bb111');

    expect(c[symbolOriginalValue]).toStrictEqual([4, 5, 6]);
    expect(c.join()).toBe('4,5,6');

    expect(c0[symbolOriginalValue]).toBe(4);
    expect(c0.valueOf()).toBe(4);

    expect(virtualResponse.a.valueOf()).toBe(1);
    expect(virtualResponse.b.valueOf()).toBe('bb');
    expect(virtualResponse.c0).toBeUndefined(); // 锁定后，不能再任意访问虚拟响应了
    const c0Primitive = virtualResponse.c[0];
    // 锁定后，当访问虚拟数据时将会返回其原始值
    expect(c0Primitive).toBe(4);
    expect(typeof c0Primitive).toBe('number');
    expect(() => {
      virtualResponse.b1.toString;
    }).toThrow();
    expect(() => {
      virtualResponse.d.toString;
    }).toThrow();
    expect(Object.keys(vDataIdCollectBasket || {})).toHaveLength(5);
    setVDataIdCollectBasket(undefined);
  });

  test('create virtual response with primitive type', () => {
    let virtualResponse = createVirtualResponse(100);
    let a = virtualResponse.a;
    let b = virtualResponse.b;
    globalVirtualResponseLock.v = 2;
    setVDataIdCollectBasket({});
    expect(a[symbolOriginalValue]).toBeUndefined();
    expect(b[symbolOriginalValue]).toBeUndefined();
    expect(virtualResponse.a).toBeUndefined();
    expect(virtualResponse.c).toBeUndefined();

    globalVirtualResponseLock.v = 0;
    virtualResponse = createVirtualResponse(true);
    a = virtualResponse.a;
    b = virtualResponse.b;
    globalVirtualResponseLock.v = 2;
    expect(a[symbolOriginalValue]).toBeUndefined();
    expect(b[symbolOriginalValue]).toBeUndefined();
    expect(virtualResponse.a).toBeUndefined();
    expect(virtualResponse.c).toBeUndefined();

    expect(Object.keys(vDataIdCollectBasket || {})).toHaveLength(2);
    setVDataIdCollectBasket(undefined);
  });
});
