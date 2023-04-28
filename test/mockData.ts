import { createAlovaMockAdapter, defineMock } from '@alova/mock';

const total = 300;
let mockListData: any;
export const setMockListData = (cb?: (data: any) => void) => {
  mockListData = typeof cb === 'function' ? cb(mockListData) : Array.from({ length: total }).map((_, i) => i);
};

let mockListWithSearchData: { id: number; word: string }[] = [];
export const setMockListWithSearchData = (cb?: (data: any) => typeof mockListWithSearchData) => {
  mockListWithSearchData =
    typeof cb === 'function'
      ? cb(mockListWithSearchData)
      : Array.from({ length: total }).map((_, i) => {
          let n = i % 3;
          return {
            id: i,
            word: ['aaa', 'bbb', 'ccc'][n]
          };
        });
};

const shortTotal = 10;
let shortList: any;
export const setMockShortListData = (cb?: (data: any) => void) => {
  shortList = typeof cb === 'function' ? cb(shortList) : Array.from({ length: shortTotal }).map((_, i) => i);
};

setMockListData();
setMockListWithSearchData();
setMockShortListData();

let detailErrorId = '';
let detailErrorTimes = 0;
const mocks = defineMock({
  '/list': ({ query }) => {
    let { page = 1, pageSize = 10, min = 0, max = Infinity } = query;
    page = Number(page);
    pageSize = Number(pageSize);
    const start = (page - 1) * pageSize;
    const filteredListData = mockListData.filter((num: number) => num >= min && num <= max);
    return {
      total: filteredListData.length,
      list: filteredListData.slice(start, start + pageSize)
    };
  },

  '/list-short': ({ query }) => {
    let { page = 1, pageSize = 10 } = query;
    page = Number(page);
    pageSize = Number(pageSize);
    const start = (page - 1) * pageSize;
    return {
      total: shortList.length,
      list: shortList.slice(start, start + pageSize)
    };
  },

  '/list-with-search': ({ query }) => {
    let { page = 1, pageSize = 10, keyword } = query;
    page = Number(page);
    pageSize = Number(pageSize);
    const start = (page - 1) * pageSize;
    const filteredList = mockListWithSearchData.filter(({ word }) => (keyword ? word === keyword : true));
    return {
      total: filteredList.length,
      list: filteredList.slice(start, start + pageSize)
    };
  },

  '/info-list': () => {
    return [
      {
        id: 10,
        text: 'a'
      },
      {
        id: 20,
        text: 'b'
      },
      {
        id: 30,
        text: 'c'
      }
    ];
  },
  '[POST]/detail': () => {
    return {
      id: 1
    };
  },
  '[DELETE]/detail/{id}': ({ params, data }) => {
    return {
      params,
      data
    };
  },
  '[POST]/detail-error': ({ data = {} }) => {
    const { id, failTimes = 3 } = data;
    // 根据id判断是否需要重置detailErrorTimes
    if (id !== detailErrorId) {
      detailErrorTimes = 0;
      detailErrorId = id;
    }

    if (detailErrorTimes < failTimes) {
      detailErrorTimes++;
      return {
        status: 403,
        statusText: 'no permission'
      };
    } else {
      detailErrorTimes = 0;
      return {
        id: 1
      };
    }
  },
  '[GET]/list-error': () => {
    return {
      status: 500,
      statusText: 'server error'
    };
  },
  '[POST]/detail2': ({ data = {} }) => {
    return {
      id: 10,
      ...data
    };
  }
});

// 模拟数据请求适配器
export const mockRequestAdapter = createAlovaMockAdapter([mocks], {
  delay: 50,
  onMockResponse: ({ status, statusText, body }) => {
    if (status >= 300) {
      const err = new Error(statusText);
      err.name = status.toString();
      throw err;
    }
    return body;
  },
  mockRequestLogger: false
});
