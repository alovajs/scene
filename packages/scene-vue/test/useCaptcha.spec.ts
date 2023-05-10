import { createAlova } from 'alova';
import VueHook from 'alova/vue';
import { mockRequestAdapter } from '~/test/mockData';
import { useCaptcha } from '..';

const alovaInst = createAlova({
  baseURL: 'http://localhost:8080',
  statesHook: VueHook,
  requestAdapter: mockRequestAdapter
});
describe('vue => useCaptcha', () => {
  test('should throw error when initialCountdown is less than 0', () => {
    const poster = alovaInst.Post('/captcha');
    expect(() => {
      useCaptcha(poster, {
        initialCountdown: -1
      });
    }).toThrow();
    expect(() => {
      useCaptcha(poster, {
        initialCountdown: 0
      });
    }).toThrow();
  });

  test('allow send captcha when countdown is 0', async () => {
    const poster = () => alovaInst.Post('/captcha');
    const { loading, countdown, data, send } = useCaptcha(poster, {
      initialCountdown: 5
    }) as any;

    // 默认不发送请求
    expect(loading.value).toBeFalsy();
    expect(countdown.value).toBe(0);
    expect(data.value).toBeUndefined();

    jest.useFakeTimers();
    const promise = send();
    expect(loading.value).toBeTruthy();
    expect(countdown.value).toBe(0);

    jest.runAllTimers();
    await promise;
    expect(countdown.value).toBe(5);
    await expect(send()).rejects.toMatch(/the countdown is not over yet/);
    jest.advanceTimersByTime(1000);
    expect(countdown.value).toBe(4);

    jest.advanceTimersByTime(1000);
    expect(countdown.value).toBe(3);

    jest.advanceTimersByTime(3000);
    expect(countdown.value).toBe(0);

    // 倒计时完成了，即使再过段时间倒计时也还是停留在0
    jest.advanceTimersByTime(3000);
    expect(countdown.value).toBe(0);
  });

  test("shouldn't start countdown when request error", async () => {
    jest.useRealTimers();
    const poster = alovaInst.Post('/captcha', { error: 1 });
    const { countdown, send } = useCaptcha(poster, {
      initialCountdown: 5
    }) as any;
    await expect(send()).rejects.toThrow('server error');
    expect(countdown.value).toBe(0);
  });

  test('initialCountdown default value is 60', async () => {
    const poster = alovaInst.Post('/captcha');
    const { countdown, send } = useCaptcha(poster) as any;
    await send();
    expect(countdown.value).toBe(60);
  });
});
