const referenceList = [] as { id: string; ref: any }[];
const uniqueIds: Record<string, 1> = {};
const generateUniqueId = () => {
	let id = Math.random().toString(36).substring(2);
	if (uniqueIds[id]) {
		id = generateUniqueId();
	}
	return id;
};

/**
 * 获取唯一的引用类型id，如果是非引用类型则返回自身
 * @param {reference} 引用类型数据
 * @returns uniqueId
 */
export default (reference: any) => {
	const refType = typeof reference;
	if (!['object', 'function', 'symbol'].includes(refType)) {
		return refType;
	}

	let existedRef = referenceList.find(({ ref }) => ref === reference);
	if (!existedRef) {
		const uniqueId = generateUniqueId();
		existedRef = {
			id: uniqueId,
			ref: reference
		};
		referenceList.push(existedRef);
		uniqueIds[uniqueId] = 1;
	}
	return existedRef.id;
};
