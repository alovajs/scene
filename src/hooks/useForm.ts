import { T$, T_$, T_exp$, TonMounted, Tupd$, TuseFlag$, Twatch } from '@/framework/type';
import {
  createAssert,
  getContext,
  isNumber,
  isObject,
  isString,
  pushItem,
  runArgsHandler,
  sloughConfig
} from '@/helper';
import createSerializerPerformer from '@/helper/serializer';
import { falseValue, trueValue, undefinedValue } from '@/helper/variables';
import { Method, UseHookReturnType, getMethodKey, useRequest } from 'alova';
import { FormHookConfig, FormHookHandler, RestoreHandler, StoreDetailConfig } from '~/typings/general';

const getStoragedKey = (methodInstance: Method, id?: ID) => `alova/form-${id || getMethodKey(methodInstance)}`;
type ID = NonNullable<FormHookConfig<any, any, any, any, any, any, any, any>['id']>;
const sharedStates = {} as Record<
  ID,
  {
    hookReturns: UseHookReturnType<any, any, any, any, any, any, any>;
    initialForm: any;
  }
>;
const assert = createAssert('useForm');
export default <S, E, R, T, RC, RE, RH, F>(
  handler: FormHookHandler<S, E, R, T, RC, RE, RH, F> | ID,
  config: FormHookConfig<S, E, R, T, RC, RE, RH, F>,
  $: T$,
  _$: T_$,
  _exp$: T_exp$,
  upd$: Tupd$,
  watch$: Twatch,
  onMounted$: TonMounted,
  useFlag$: TuseFlag$
) => {
  // 如果第一个参数传入的是id，则获取它的初始化数据并返回
  let checkSharedState = falseValue;
  if (isNumber(handler) || isString(handler)) {
    config = { id: handler as ID };
    checkSharedState = trueValue;
  }

  // 默认不发送请求
  const { id } = config;
  // id有值时才检查是共用数据
  if (id) {
    const sharedState = sharedStates[id];
    // 当第一个参数为id时，必须检查sharedState是否有值
    assert(!checkSharedState || !!sharedState, `the form data of id \`${id}\` is not initial`);
    if (sharedState) {
      return sharedState.hookReturns;
    }
  }

  const { initialForm, store, resetAfterSubmit, immediate = falseValue, middleware } = config,
    form = $(initialForm),
    methodHandler = handler as FormHookHandler<S, E, R, T, RC, RE, RH, F>,
    restoreHandlers: RestoreHandler[] = [],
    initialMethodInstance = sloughConfig(methodHandler, [_$(form)]),
    isStoreObject = isObject(store),
    enableStore = isStoreObject ? (store as StoreDetailConfig).enable : store,
    storageContext = getContext(initialMethodInstance).storage,
    storagedKey = useFlag$(getStoragedKey(initialMethodInstance, id)),
    reseting = useFlag$(falseValue),
    serializerPerformer = useFlag$(
      createSerializerPerformer(isStoreObject ? (store as StoreDetailConfig).serializers : undefinedValue)
    );

  /**
   * 重置form数据
   */
  const reset = () => {
    reseting.v = trueValue;
    upd$(form, initialForm);
    enableStore && storageContext.remove(storagedKey.v);
  };

  /**
   * 更新form数据
   * @param newForm 新表单数据
   */
  const updateForm = (newForm: Partial<F> | ((oldForm: F) => F)) => {
    upd$(form as any, {
      ..._$(form),
      ...newForm
    });
  };
  let hookReturns = {
    form: _exp$(form),

    // 第一个参数固定为form数据
    ...useRequest((...args: any[]) => methodHandler(_$(form) as any, ...args), {
      ...config,

      // 中间件函数，也支持subscriberMiddleware
      middleware: middleware
        ? (ctx, next) =>
            middleware(
              {
                ...ctx,
                delegatingActions: { updateForm, reset }
              } as any,
              next
            )
        : undefinedValue,

      // 当需要持久化时，将在数据恢复后触发
      immediate: enableStore ? falseValue : immediate
    }),

    // 持久化数据恢复事件绑定
    onRestore(handler: RestoreHandler) {
      pushItem(restoreHandlers, handler);
    },
    updateForm,
    reset
  };
  // 有id才保存到sharedStates中
  id &&
    (sharedStates[id] = {
      hookReturns,
      initialForm
    });

  const { send, onSuccess } = hookReturns;
  // 需要持久化时更新data
  if (enableStore) {
    onMounted$(() => {
      // 获取存储并更新data
      // 需要在onMounted中调用，否则会导致在react中重复被调用
      const storagedForm = serializerPerformer.v.deserialize(storageContext.get(storagedKey.v));

      // 有草稿数据时，异步恢复数据，否则无法正常绑定onRetore事件
      if (storagedForm) {
        upd$(form, storagedForm);
        // 触发持久化数据恢复事件
        runArgsHandler(restoreHandlers);
        enableStore && immediate && send();
      }
    });

    // 监听变化同步存储
    watch$([form], () => {
      if (reseting.v) {
        reseting.v = falseValue;
        return;
      }
      storageContext.set(storagedKey.v, serializerPerformer.v.serialize(_$(form)));
    });
  }
  // 如果在提交后需要清除数据，则调用reset
  onSuccess(() => {
    resetAfterSubmit && reset();
  });

  return hookReturns;
};
