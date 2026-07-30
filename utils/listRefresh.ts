type ListKey = 'orders' | 'retailers' | 'items';

const dirtyFlags: Record<ListKey, boolean> = {
  orders: false,
  retailers: false,
  items: false,
};

export function markListDirty(list: ListKey) {
  dirtyFlags[list] = true;
}

export function consumeListDirty(list: ListKey): boolean {
  if (!dirtyFlags[list]) return false;
  dirtyFlags[list] = false;
  return true;
}
