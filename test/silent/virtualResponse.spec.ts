import { setVDataIdCollectBasket, vDataIdCollectBasket } from '../../src/hooks/silent/globalVariables';
import createVirtualResponse from '../../src/hooks/silent/virtualResponse/createVirtualResponse';
import { symbolVDataId } from '../../src/hooks/silent/virtualResponse/variables';

// 虚拟响应测试
describe('virtual response', () => {
  test('undefined virtual data', () => {
    const undef = createVirtualResponse(undefined);
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
    expect(Object.keys(vDataIdCollectBasket || {})).toHaveLength(1);
    setVDataIdCollectBasket(undefined);
  });

  test('null virtual data', () => {
    const nil = createVirtualResponse(null);
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

    expect(Object.keys(vDataIdCollectBasket || {})).toHaveLength(1);
    setVDataIdCollectBasket(undefined);
  });

  test('create virtual response with primitive type', () => {
    // 基本类型包装对象拥有和基本类型一样的表现
    const vNumber = createVirtualResponse(1);
    expect(vNumber).toBeInstanceOf(Number);
    expect(vNumber.toFixed(1)).toBe('1.0');
    expect(vNumber.valueOf()).toBe(1);
    expect(vNumber.toString()).toBe('1');
    expect(vNumber + 100).toBe(101);

    const vStr = createVirtualResponse('bb');
    expect(vStr.valueOf()).toBe('bb');
    expect(vStr.replace('bb', 'ccc')).toBe('ccc');
    expect(vStr + 111).toBe('bb111');

    const vBool = createVirtualResponse(true);
    expect(vBool.valueOf()).toBe(true);
    expect(vBool + 111).toBe(112);
    expect(vBool + 'aa').toBe('trueaa');
  });

  test('create virtual response with object', () => {
    const vObject = createVirtualResponse({
      a: 1,
      b: 'bb',
      c: [1, 2, 3]
    });
    const a = vObject.a;
    const b = vObject.b;
    const b1 = vObject.b.b1;
    const c = vObject.c;
    const c0 = vObject.c[0];
    expect(vObject[symbolVDataId]).not.toBeUndefined();
    expect(a).toBeInstanceOf(Number);
    expect(a[symbolVDataId]).not.toBeUndefined();
    expect(b).toBeInstanceOf(String);
    expect(b[symbolVDataId]).not.toBeUndefined();
    expect(b1).toBeUndefined();
    expect(c).toBeInstanceOf(Array);
    expect(c[symbolVDataId]).not.toBeUndefined();
    expect(c0).toBeInstanceOf(Number);
    expect(c0[symbolVDataId]).not.toBeUndefined();
  });

  test('create virtual response with array contained non plain object', () => {
    class A {
      aa = 1;
      bb = 'bb';
    }
    const vArray = createVirtualResponse([111, /123/, new Date(), new A()]);
    const [$1, $2, $3, $4] = vArray;
    expect(vArray).toBeInstanceOf(Array);
    expect(vArray[symbolVDataId]).not.toBeUndefined();
    expect($1).toBeInstanceOf(Number);
    expect($1[symbolVDataId]).not.toBeUndefined();
    expect($2).toBeInstanceOf(RegExp);
    expect($2[symbolVDataId]).not.toBeUndefined();
    expect($3).toBeInstanceOf(Date);
    expect($3[symbolVDataId]).not.toBeUndefined();
    expect($4).toBeInstanceOf(A);
    expect($4[symbolVDataId]).not.toBeUndefined();
    expect($4.aa).toBeInstanceOf(Number);
    expect($4.bb).toBeInstanceOf(String);
  });
});
