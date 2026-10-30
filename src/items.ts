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
}

const STORAGE_KEY = 'shopping-list.v1';
const HISTORY_SIZE = 100;

const EMPTY: Data = { items: [], history: [] };

export function loadData(): Data {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Data>) } : EMPTY;
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

const same = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

// Put a name at the start of the history and remove older copies of it.
function remember(history: string[], name: string): string[] {
  return [name, ...history.filter((h) => !same(h, name))].slice(0, HISTORY_SIZE);
}

// The items that are still to buy, oldest first.
export function toBuy(data: Data): Item[] {
  return data.items.filter((i) => i.boughtAt === null);
}

// The items in the cart, most recently bought first.
export function inCart(data: Data): Item[] {
  return data.items.filter((i) => i.boughtAt !== null).sort((a, b) => b.boughtAt! - a.boughtAt!);
}

// Names from the history that contain the query and are not on the list.
export function suggestions(data: Data, query: string): string[] {
  const q = query.trim().toLocaleLowerCase();
  return data.history.filter(
    (name) => name.toLocaleLowerCase().includes(q) && !data.items.some((i) => same(i.name, name)),
  );
}

export function addItem(data: Data, name: string, quantity: string): Data {
  const item = { id: crypto.randomUUID(), name, quantity, boughtAt: null };
  return { items: [...data.items, item], history: remember(data.history, name) };
}

export function updateItem(data: Data, id: string, name: string, quantity: string): Data {
  return {
    items: data.items.map((i) => (i.id === id ? { ...i, name, quantity } : i)),
    history: remember(data.history, name),
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
