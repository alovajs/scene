import '@testing-library/jest-dom';
import { createAlova } from 'alova';
import ReactHook from 'alova/react';
import { mockRequestAdapter } from '~/test/mockData';
import { useRetriableRequest } from '..';

const alovaInst = createAlova({
  baseURL: 'http://localhost:8080',
  statesHook: ReactHook,
  requestAdapter: mockRequestAdapter
});
describe('react => useRetriableRequest', () => {
  test('should default retry 3 times', async () => {
    const methodInstance = alovaInst.Patch('/detail-error', {
      id: 'a',
      failTimes: 1
    });
    const { loading } = useRetriableRequest(methodInstance);
  });

  test('should retry specific times when set retry with number', async () => {});
  test('should retry when set retry with function which returns true', async () => {});
  test('should delay the time to retry according to param backoff', async () => {});
  test('retring should effect when call send function', async () => {});
  test('should stop retry when call stop function manually', async () => {});
});
