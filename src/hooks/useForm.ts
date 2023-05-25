import { T$, Tupd$, Twatch, T_$, T_exp$ } from '@/framework/type';
import {
  createAssert,
  getContext,
  isNumber,
  isString,
  pushItem,
  runArgsHandler,
  setTimeoutFn,
  sloughConfig
} from '@/helper';
import { falseValue, trueValue, undefinedValue } from '@/helper/variables';
import { getMethodKey, Method, UseHookReturnType, useRequest } from 'alova';
import { FormHookConfig, FormHookHandler, RestoreHandler } from '~/typings/general';

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
  watch: Twatch
) => {
  // 如果第一个参数传入的是id，则获取它的初始化数据并返回
  let checkSharedState = falseValue;
  if (isNumber(handler) || isString(handler)) {
    config = { id: handler as ID };
    checkSharedState = trueValue;
  }

  // 默认不发送请求
  const { id, initialForm, store, resetAfterSubmit, immediate = falseValue, middleware } = config;

  // id有值时才检查是共用数据
  if (id) {
    const sharedState = sharedStates[id];
    // 当第一个参数为id时，必须检查sharedState是否有值
    assert(!checkSharedState || !!sharedState, `the form data of id \`${id}\` is not initial`);
    if (sharedState) {
      return sharedState.hookReturns;
    }
  }

  const form = $(initialForm);
  const methodHandler = handler as FormHookHandler<S, E, R, T, RC, RE, RH, F>;
  const restoreHandlers: RestoreHandler[] = [];

  /**
   * 重置form数据
   */
  const reset = () => {
    upd$(form, initialForm);
    store && storageContext.remove(storagedKey);
  };

  /**
   * 更新form数据
   * @param newForm 新表单数据
   */
  const updateForm = (newForm: F | ((oldForm: F) => F)) => {
    upd$(form as any, newForm);
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
      immediate: store ? falseValue : immediate
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
  const initialMethodInstance = sloughConfig(methodHandler, [_$(form)]);
  const storageContext = getContext(initialMethodInstance).storage;
  const storagedKey = getStoragedKey(initialMethodInstance, id);
  // 需要持久化时更新data
  if (store) {
    // 获取存储并更新data
    const storagedForm = storageContext.get(storagedKey);

    // 有草稿数据时，异步恢复数据，否则无法正常绑定onRetore事件
    storagedForm &&
      setTimeoutFn(() => {
        upd$(form, storagedForm);
        // 触发持久化数据恢复事件
        runArgsHandler(restoreHandlers);
        store && immediate && send();
      });

    // 监听变化同步存储
    watch([form], () => {
      storageContext.set(storagedKey, _$(form));
    });
  }
  // 如果在提交后需要清除数据，则调用reset
  onSuccess(() => {
    resetAfterSubmit && reset();
  });

  return hookReturns;
};
