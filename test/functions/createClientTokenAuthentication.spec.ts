import { createAlova } from 'alova';
import VueHook from 'alova/vue';
import { createClientTokenAuthentication } from '../../packages/scene-vue';
import { mockRequestAdapter } from '../mockData';

describe('createClientTokenAuthentication', async () => {
  test('should be able to create a client token authentication', async () => {
    const { onAuthRequired, onResponseRefreshToken } = createClientTokenAuthentication({
      login: (response, method) => {
        response.json(), method.abort();
      }
    });

    const alovaInst = createAlova({
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter,
      beforeRequest: onAuthRequired(method => {
        console.log(method);
      }),
      responded: onResponseRefreshToken((response, method) => {
        console.log(response, method);
      })
    });

    const clientTokenAuthentication = createClientTokenAuthentication(alovaInst);
    expect(clientTokenAuthentication).toBeTruthy();
    expect(clientTokenAuthentication.login).toBeTruthy();
    expect(clientTokenAuthentication.logout).toBeTruthy();
    expect(clientTokenAuthentication.refresh).toBeTruthy();
  });
});
