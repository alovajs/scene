import { act } from '@testing-library/react';

export const untilCbCalled = <T>(setCb: (cb: (arg: T) => void, ...others: any[]) => void, ...args: any[]) =>
  new Promise<T>(resolve => {
    setCb(d => {
      resolve(d);
    }, ...args);
  });

export const generateContinuousNumbers = (
  end: number,
  start = 0,
  transform: ((i: number) => any) | Record<string | number, any> = i => i
) => {
  const transformFn = typeof transform === 'object' ? (i: number) => transform[i] || i : transform;
  return Array.from({ length: Math.abs(end - start + 1) }).map((_, i) => transformFn(start + i));
};

export async function waitForWithFakeTimers(cb: () => void) {
  let waiting = true;
  while (waiting) {
    await act(() =>
      Promise.resolve()
        .then(() => jest.runAllTimers())
        .then(() => new Promise(resolve => setTimeout(resolve, 0)))
    );
    try {
      cb();
      waiting = false;
    } catch {}
  }
}
