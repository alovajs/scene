import { createAlova, updateState, useRequest } from 'alova';
import VueHook from 'alova/vue';
import { setDependentAlova } from '../../src/hooks/silent/globalVariables';
import { mergeSerializer } from '../../src/hooks/silent/serializer';
import decorateStorageAdapter from '../../src/hooks/silent/storage/decorateStorageAdapter';
import { storageGetItem } from '../../src/hooks/silent/storage/helper';
import createVirtualResponse from '../../src/hooks/silent/virtualResponse/createVirtualResponse';
import { mockRequestAdapter } from '../mockData';
import { untilCbCalled } from '../utils';

// 响应数据持久化时，自动转换虚拟数据和匹配序列化器的数据
describe('serialize response data', () => {
  test('serialize response data with useRequest', async () => {
    const mockStorage = {} as Record<string, any>;
    const alovaInst = createAlova({
      baseURL: 'http://xxx',
      statesHook: VueHook,
      requestAdapter: mockRequestAdapter,
      storageAdapter: {
        set(key, value) {
          mockStorage[key] = value;
        },
        get(key) {
          return mockStorage[key];
        },
        remove(key) {
          delete mockStorage[key];
        }
      }
    });
    decorateStorageAdapter(alovaInst.storage);
    setDependentAlova(alovaInst);
    mergeSerializer(); // 初始化序列化器，否则没有默认的序列化器

    // 先构造一个带虚拟数据和可序列化的缓存
    const Get = alovaInst.Get('/list', {
      name: 'test-get',
      localCache: {
        mode: 'restore',
        expire: Infinity
      },
      transformData: (data: { total: number; list: number[] }) => data.list
    });
    const { onSuccess } = useRequest(Get);
    await untilCbCalled(onSuccess);
    const vData = createVirtualResponse(100);
    const date = new Date('2022-10-01 00:00:00');
    updateState('test-get', listRaw => {
      listRaw.push(vData, date, /tttt/);
      return listRaw;
    });

    // 查看mockStorage内的数据是否如预期
    const deserializedResponse = storageGetItem(Object.keys(mockStorage)[0])?.[0] || [];
    expect(deserializedResponse.pop().source).toBe('tttt');
    expect(deserializedResponse.pop().getTime()).toBe(date.getTime());
  });
});
