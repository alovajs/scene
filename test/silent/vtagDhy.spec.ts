import createVirtualResponse from '../../src/hooks/silent/virtualTag/createVirtualResponse';
import vtagDhy from '../../src/hooks/silent/virtualTag/vtagDhy';

describe('vtagDhy', () => {
  test('primitive value', () => {
    expect(vtagDhy(1)).toBe(1);
    expect(vtagDhy('str')).toBe('str');
    expect(vtagDhy(true)).toBe(true);
  });
  test('primitive wrap value', () => {
    const num = new Object(1);
    const str = new Object('abc');
    const bool = new Object(true);
    expect(vtagDhy(num)).toBe(num);
    expect(vtagDhy(str)).toBe(str);
    expect(vtagDhy(bool)).toBe(bool);
  });
  test('primitive wrap vtag value', () => {
    const num = createVirtualResponse(1);
    const str = createVirtualResponse('abc');
    const bool = createVirtualResponse(true);
    expect(vtagDhy(num)).toBe(1);
    expect(vtagDhy(str)).toBe('abc');
    expect(vtagDhy(bool)).toBe(true);
  });
  test('undefined wrap value', () => {
    const undef = createVirtualResponse(undefined);
    expect(vtagDhy(undef)).toBeUndefined();
  });
  test('null wrap value', () => {
    const nil = createVirtualResponse(null);
    expect(vtagDhy(nil)).toBeNull();
  });
  test('reference value', () => {
    const ary = [1, 2, 3];
    const obj = { a: 1 };
    const date = new Date();
    expect(vtagDhy(ary)).toBe(ary);
    expect(vtagDhy(obj)).toBe(obj);
    expect(vtagDhy(date)).toBe(date);
  });
  test('reference vtag value', () => {
    const ary = [1, 2, 3];
    const obj = { a: 1 };
    const date = new Date();
    expect(vtagDhy(createVirtualResponse(ary))).toBe(ary);
    expect(vtagDhy(createVirtualResponse(obj))).toBe(obj);
    expect(vtagDhy(createVirtualResponse(date))).toBe(date);
  });
});
