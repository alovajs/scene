import { updateState } from 'alova';
import { noop } from 'svelte/internal';
import { isFn, objectKeys } from '../../../helper';
import { currentSilentMethod } from '../createSilentQueueMiddlewares';

/**
 * 更新对应method的状态
 * 与updateState不同的是，除了立即更新状态外，它还会在silent模式下响应后再次更新一次，目的是将虚拟标签替换为实际数据
 * @param method 请求方法对象
 * @param handleUpdate 更新回调
 */
const updateStateEffect: typeof updateState = (matcher, handleUpdate, options = {}) => {
	const onMatch = options.onMatch;
	options.onMatch = method => {
		// 将目标method实例保存到当前的silentMethod实例
		if (currentSilentMethod) {
			currentSilentMethod.targetRefMethod = method;
			currentSilentMethod.updateStates = isFn(updateState) ? ['data'] : objectKeys(updateState);
		}
		(onMatch || noop)(method);
	};
	return updateState(matcher, handleUpdate, options);
};

export default updateStateEffect;
