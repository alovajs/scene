import { $, $$, upd$, watch$, _$, _exp$, _expBatch$ } from '@/framework/react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { ReactElement } from 'react';

// 测试react的封装函数
describe('react framework functions', () => {
  test('state, computed and update', async () => {
    function Page() {
      const state1 = $(0);
      const [stateVal1, setStateVal1] = state1;
      const pageCount = $$(() => stateVal1 + '_a', [stateVal1]);
      return (
        <div>
          <span role="state1">{stateVal1}</span>
          <span role="pageCount">{pageCount}</span>
          <button
            role="btn"
            onClick={() => setStateVal1((v: number) => v + 1)}>
            btn
          </button>
          <button
            role="btnUpd$"
            onClick={() => upd$(state1, (v: number) => v + 100)}>
            btn
          </button>
        </div>
      );
    }

    render((<Page />) as ReactElement<any, any>);
    await screen.findByText('0');
    expect(screen.getByRole('pageCount')).toHaveTextContent('0_a');
    fireEvent.click(screen.getByRole('btn'));
    await screen.findByText('1');
    expect(screen.getByRole('pageCount')).toHaveTextContent('1_a');
    fireEvent.click(screen.getByRole('btnUpd$'));
    expect(screen.getByRole('pageCount')).toHaveTextContent('101_a');
  });

  test('dehydrate states', async () => {
    function Page() {
      const state1 = $(0);
      const state2 = $('a');
      return (
        <div>
          <span>flag</span>
          <span role="state1">{_$(state1)}</span>
          <span role="state_exp1">{_exp$(state1)}</span>
          <span role="allStates">{JSON.stringify(_expBatch$(state1, state2))}</span>
        </div>
      );
    }

    render((<Page />) as ReactElement<any, any>);
    await screen.findByText('flag');
    expect(screen.getByRole('state1')).toHaveTextContent('0');
    expect(screen.getByRole('state_exp1')).toHaveTextContent('0');
    expect(screen.getByRole('allStates')).toHaveTextContent('[0,"a"]');
  });

  test('watch states', async () => {
    const mockFn = jest.fn();
    function Page() {
      const state1 = $(0);
      const state2 = $('a');
      watch$(_expBatch$(state1, state2), mockFn);
      return (
        <div>
          <span>flag</span>
          <span role="state1">{_$(state1)}</span>
          <span role="state2">{_$(state2)}</span>
          <span role="allStates">{JSON.stringify(_expBatch$(state1, state2))}</span>
          <button
            role="btnState1"
            onClick={() => upd$(state1, 1)}>
            btn1
          </button>
          <button
            role="btnState2"
            onClick={() => upd$(state2, 'b')}>
            btn2
          </button>
          <button
            role="btnAllStates"
            onClick={() => {
              upd$(state1, 2);
              upd$(state2, 'c');
            }}>
            btn3
          </button>
        </div>
      );
    }

    render((<Page />) as ReactElement<any, any>);
    await screen.findByText('flag');
    fireEvent.click(screen.getByRole('btnState1'));
    await screen.findByText('1');
    expect(mockFn).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('btnState2'));
    await screen.findByText('b');
    expect(mockFn).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('btnAllStates'));
    await screen.findByText('c');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });
});
