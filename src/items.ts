export interface Item {
  id: string;
  name: string;
  // Free text such as "2", "500 g" or "1 pack". Empty when not set.
  quantity: string;
  // Time in milliseconds since the epoch when the item was put into the cart,
  // or null for an item that is still to buy.
  boughtAt: number | null;
}

export interface Data {
  // All items in the order of creation, oldest first.
  items: Item[];
  // Names of earlier items, most recent first, for quick selection.
  history: string[];
  // The number of times that each name of the history was added, by the
  // lower-case name.
  uses: Record<string, number>;
}

const STORAGE_KEY = 'shopping-list.v1';
const HISTORY_SIZE = 100;

const EMPTY: Data = { items: [], history: [], uses: {} };

const key = (name: string) => name.toLocaleLowerCase();

// Give each name of the history a use count. A name without a count has one
// use.
function withUses(data: Data): Data {
  const uses = { ...data.uses };
  for (const name of data.history) uses[key(name)] ??= 1;
  return { ...data, uses };
}

export function loadData(): Data {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? withUses({ ...EMPTY, ...(JSON.parse(raw) as Partial<Data>) }) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function saveData(data: Data): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage is full or blocked; the data stays in memory only.
  }
}

const same = (a: string, b: string) => key(a) === key(b);

// Put a name at the start of the history, remove older copies of it and add
// one use. The counts of names that drop out of the history are removed.
function remember(data: Data, name: string): Pick<Data, 'history' | 'uses'> {
  const history = [name, ...data.history.filter((h) => !same(h, name))].slice(0, HISTORY_SIZE);
  const uses: Record<string, number> = {};
  for (const h of history) uses[key(h)] = data.uses[key(h)] ?? 0;
  uses[key(name)]++;
  return { history, uses };
}

// Remove a name and its use count from the history, so that the form does not
// suggest it.
export function forget(data: Data, name: string): Data {
  const { [key(name)]: _, ...uses } = data.uses;
  return { ...data, history: data.history.filter((h) => !same(h, name)), uses };
}

// The items that are still to buy, oldest first.
export function toBuy(data: Data): Item[] {
  return data.items.filter((i) => i.boughtAt === null);
}

// The items in the cart, most recently bought first.
export function inCart(data: Data): Item[] {
  return data.items.filter((i) => i.boughtAt !== null).sort((a, b) => b.boughtAt! - a.boughtAt!);
}

// Names from the history that contain the query, are not the query itself and
// are not on the list of items to buy. Names that start with the query come
// first. Within each group, the most used names come first, and names with
// the same count are in the order of the history, most recent first.
export function suggestions(data: Data, query: string): string[] {
  const q = key(query.trim());
  const open = toBuy(data);
  const starts = (name: string) => (key(name).startsWith(q) ? 0 : 1);
  return data.history
    .filter((name) => key(name).includes(q) && key(name) !== q && !open.some((i) => same(i.name, name)))
    .sort((a, b) => starts(a) - starts(b) || (data.uses[key(b)] ?? 0) - (data.uses[key(a)] ?? 0));
}

export function addItem(data: Data, name: string, quantity: string): Data {
  const item = { id: crypto.randomUUID(), name, quantity, boughtAt: null };
  return { items: [...data.items, item], ...remember(data, name) };
}

// Update an item. A new name counts as one use; the same name does not.
export function updateItem(data: Data, id: string, name: string, quantity: string): Data {
  const renamed = data.items.some((i) => i.id === id && !same(i.name, name));
  return {
    ...data,
    items: data.items.map((i) => (i.id === id ? { ...i, name, quantity } : i)),
    ...(renamed ? remember(data, name) : {}),
  };
}

export function toggleItem(data: Data, id: string): Data {
  return {
    ...data,
    items: data.items.map((i) =>
      i.id === id ? { ...i, boughtAt: i.boughtAt === null ? Date.now() : null } : i,
    ),
  };
}

export function removeItem(data: Data, id: string): Data {
  return { ...data, items: data.items.filter((i) => i.id !== id) };
}

export function clearCart(data: Data): Data {
  return { ...data, items: toBuy(data) };
}
