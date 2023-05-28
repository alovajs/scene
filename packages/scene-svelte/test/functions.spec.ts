import { $, $$, upd$, watch$, _$, _exp$, _expBatch$ } from '@/framework/svelte';
import { untilCbCalled } from '~/test/utils';

// 测试svelte的封装函数
describe('svelte framework functions', () => {
  test('state, computed and update', () => {
    const state1 = $(0);
    const pageCount = $$(() => _$(state1) + '_a', _expBatch$(state1));

    expect(_$(state1)).toBe(0);
    expect(_$(pageCount)).toBe('0_a');
    upd$(state1, 1);
    expect(_$(pageCount)).toBe('1_a');
  });

  test('dehydrate states', () => {
    const state1 = $(0);
    const state2 = $('a');
    expect(_$(state1)).toBe(0);
    expect(_exp$(state1)).toBe(state1);
    expect(_expBatch$(state1, state2)).toStrictEqual([state1, state2]);
  });

  test('watch states', async () => {
    const mockFn = jest.fn();
    const state1 = $(0);
    const state2 = $('a');
    watch$(_expBatch$(state1, state2), mockFn);
    await untilCbCalled(setTimeout, 5);

    upd$(state1, 1);
    await untilCbCalled(setTimeout, 5);
    expect(mockFn).toBeCalledTimes(1);

    upd$(state2, 'b');
    await untilCbCalled(setTimeout, 5);
    expect(mockFn).toBeCalledTimes(2);

    upd$(state1, 2);
    upd$(state2, 'c');
    await untilCbCalled(setTimeout, 5);
    expect(mockFn).toBeCalledTimes(3);
  });
});
