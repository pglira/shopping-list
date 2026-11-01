import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { BackupForm } from './BackupForm';
import { Icon, type IconName } from './icons';
import {
  type Data,
  type Item,
  addItem,
  clearCart,
  inCart,
  loadData,
  removeItem,
  saveData,
  suggestions,
  toBuy,
  toggleItem,
  updateItem,
} from './items';
import { type Theme, useTheme } from './theme';

const THEME_ICONS: Record<Theme, IconName> = { auto: 'auto', light: 'sun', dark: 'moon' };
const THEME_LABELS: Record<Theme, string> = {
  auto: 'Theme: system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

// The open sheet: an item form (id null for a new item) or the backup.
type Sheet = { id: string | null } | { backup: true } | null;

// The backup holds all stored data of the app except the theme.
const APP_ID = 'shopping-list';
const isDataKey = (key: string) => key.startsWith(`${APP_ID}.`) && key !== `${APP_ID}.theme`;

export default function App() {
  const [data, setData] = useState<Data>(loadData);
  const [sheet, setSheet] = useState<Sheet>(null);
  // The id of the item whose row shows the swipe actions.
  const [swiped, setSwiped] = useState<string | null>(null);
  const [theme, nextTheme] = useTheme();

  useEffect(() => saveData(data), [data]);

  const open = toBuy(data);
  const cart = inCart(data);
  const close = () => setSheet(null);
  const sheetItem = sheet && 'id' in sheet && sheet.id ? data.items.find((i) => i.id === sheet.id) : undefined;

  const row = (item: Item) => (
    <SwipeRow
      key={item.id}
      className={item.boughtAt === null ? 'item' : 'item done'}
      open={swiped === item.id}
      onOpen={() => setSwiped(item.id)}
      onClose={() => setSwiped(null)}
      onEdit={() => {
        setSwiped(null);
        setSheet({ id: item.id });
      }}
      onDelete={() => {
        setSwiped(null);
        setData((d) => removeItem(d, item.id));
      }}
    >
      <button
        className="toggle"
        role="checkbox"
        aria-checked={item.boughtAt !== null}
        onClick={() => setData((d) => toggleItem(d, item.id))}
      >
        <span className="box">{item.boughtAt !== null && <Icon name="check" size={18} />}</span>
        <span className="text">{item.name}</span>
        {item.quantity && <span className="quantity">{item.quantity}</span>}
      </button>
    </SwipeRow>
  );

  return (
    <main>
      <header>
        <h1>Shopping</h1>
        <div className="header-buttons">
          <button className="icon" onClick={() => setSheet({ backup: true })} aria-label="Backup" title="Backup">
            <Icon name="backup" />
          </button>
          <button
            className="icon"
            onClick={nextTheme}
            aria-label={THEME_LABELS[theme]}
            title={THEME_LABELS[theme]}
          >
            <Icon name={THEME_ICONS[theme]} />
          </button>
          <button className="add" onClick={() => setSheet({ id: null })} aria-label="Add item" title="Add item">
            <Icon name="plus" size={24} />
          </button>
        </div>
      </header>

      {data.items.length === 0 ? (
        <p className="empty">The list is empty. Tap + to add an item.</p>
      ) : (
        <div className="toolbar">
          <span>{open.length === 1 ? '1 item to buy' : `${open.length} items to buy`}</span>
        </div>
      )}

      {data.items.length > 0 && open.length === 0 && <p className="empty">All items are in the cart.</p>}
      <ul>{open.map(row)}</ul>

      {cart.length > 0 && (
        <>
          <div className="section">
            <h2>In the cart ({cart.length})</h2>
            <ClearButton onConfirm={() => setData(clearCart)} />
          </div>
          <ul>{cart.map(row)}</ul>
        </>
      )}

      {sheet && 'backup' in sheet && <BackupForm app={APP_ID} isKey={isDataKey} onClose={close} />}

      {sheet && 'id' in sheet && (
        <ItemForm
          key={sheet.id ?? 'new'}
          data={data}
          item={sheetItem}
          onCancel={close}
          onAdd={(name) => setData((d) => addItem(d, name, ''))}
          onSave={(name, quantity) => {
            setData((d) => (sheetItem ? updateItem(d, sheetItem.id, name, quantity) : addItem(d, name, quantity)));
            close();
          }}
          onDelete={
            sheetItem
              ? () => {
                  setData((d) => removeItem(d, sheetItem.id));
                  close();
                }
              : undefined
          }
        />
      )}
    </main>
  );
}

// Width of the swipe actions in pixels, and the distance a pointer must move
// before a row starts to follow it.
const SWIPE_WIDTH = 160;
const SWIPE_SLOP = 10;

interface SwipeRowProps {
  className: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode;
}

// A list row that shows the Edit and Delete actions when the user swipes it
// to the left. Delete asks for a second tap. A swipe to the right, a tap on
// the row or a tap outside the row hides the actions. A tap that ends a swipe
// does not reach the row content.
function SwipeRow({ className, open, onOpen, onClose, onEdit, onDelete, children }: SwipeRowProps) {
  const row = useRef<HTMLLIElement>(null);
  const gesture = useRef<{ x: number; y: number; swiping: boolean } | null>(null);
  const swiped = useRef(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [armed, setArmed] = useState(false);
  const base = open ? -SWIPE_WIDTH : 0;
  const offset = drag ?? base;

  useEffect(() => {
    if (!open) {
      setArmed(false);
      return;
    }
    const onDown = (e: globalThis.PointerEvent) => {
      if (!row.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, onClose]);

  const position = (e: PointerEvent) => Math.min(0, Math.max(-SWIPE_WIDTH, base + e.clientX - gesture.current!.x));

  const onPointerDown = (e: PointerEvent) => {
    gesture.current = { x: e.clientX, y: e.clientY, swiping: false };
    swiped.current = false;
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    if (!g.swiping) {
      const dx = Math.abs(e.clientX - g.x);
      const dy = Math.abs(e.clientY - g.y);
      if (dy > SWIPE_SLOP && dy > dx) gesture.current = null;
      if (dx <= SWIPE_SLOP || dx <= dy) return;
      g.swiping = true;
      swiped.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDrag(position(e));
  };

  const onPointerUp = (e: PointerEvent) => {
    if (gesture.current?.swiping) {
      if (position(e) < -SWIPE_WIDTH / 2) onOpen();
      else onClose();
    }
    gesture.current = null;
    setDrag(null);
  };

  return (
    <li ref={row} className="swipe">
      <div className="swipe-actions" style={{ width: SWIPE_WIDTH }} aria-hidden={!open}>
        <button className="swipe-edit" tabIndex={open ? 0 : -1} onClick={onEdit}>
          <Icon name="edit" />
          Edit
        </button>
        <button
          className="swipe-delete"
          tabIndex={open ? 0 : -1}
          onClick={() => (armed ? onDelete() : setArmed(true))}
        >
          <Icon name="trash" />
          {armed ? 'Confirm' : 'Delete'}
        </button>
      </div>
      <div
        className={drag === null ? `${className} settle` : className}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          gesture.current = null;
          setDrag(null);
        }}
        onClickCapture={(e) => {
          if (!swiped.current && !open) return;
          e.preventDefault();
          e.stopPropagation();
          if (!swiped.current) onClose();
          swiped.current = false;
        }}
      >
        {children}
      </div>
    </li>
  );
}

const CONFIRM_MS = 3000;

// Remove all items in the cart after a second tap. The button returns to its
// first state when the second tap does not come within CONFIRM_MS.
function ClearButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      className={armed ? 'clear armed' : 'clear'}
      onClick={() => {
        if (armed) onConfirm();
        setArmed(!armed);
      }}
    >
      <Icon name="trash" size={18} />
      {armed ? 'Tap to confirm' : 'Clear'}
    </button>
  );
}

// Maximum number of earlier items that the form for a new item shows: as
// chips while the item field is empty, and as matches while the user types.
const SUGGESTIONS = 12;
const MATCHES = 5;

interface ItemFormProps {
  data: Data;
  // The item to edit, or undefined for a new item.
  item?: Item;
  onSave: (name: string, quantity: string) => void;
  // Add an earlier item to the list and keep the form open.
  onAdd: (name: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

// The text with the first match of the query in bold.
function Highlight({ text, query }: { text: string; query: string }) {
  const at = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <strong>{text.slice(at, at + query.length)}</strong>
      {text.slice(at + query.length)}
    </>
  );
}

// Add or edit an item. While the user types the name of a new item, the form
// shows the matching earlier items: a tap on a name puts it into the item
// field, and a tap on its + adds it to the list. While the item field is
// empty, the form shows the earlier items as chips; a tap adds the item. The
// form for a new item stays open after a tap on an earlier item.
function ItemForm(props: ItemFormProps) {
  const [name, setName] = useState(props.item?.name ?? '');
  const [quantity, setQuantity] = useState(props.item?.quantity ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const value = name.trim();
  const earlier = props.item ? [] : suggestions(props.data, name);
  const nameField = useRef<HTMLInputElement>(null);
  const quantityField = useRef<HTMLInputElement>(null);

  return (
    <div className="backdrop" onClick={props.onCancel}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && props.onCancel()}
        onSubmit={(e) => {
          e.preventDefault();
          if (value) props.onSave(value, quantity.trim());
        }}
      >
        <h2>{props.item ? 'Edit item' : 'New item'}</h2>
        <div className="fields">
          <label>
            Item
            <input
              ref={nameField}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="For example: milk"
              enterKeyHint="done"
            />
          </label>
          <label className="quantity-field">
            Quantity
            <input
              ref={quantityField}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Optional"
              enterKeyHint="done"
            />
          </label>
        </div>
        {value && earlier.length > 0 && (
          <ul className="matches" aria-label="Earlier items">
            {earlier.slice(0, MATCHES).map((n) => (
              <li key={n}>
                <button
                  type="button"
                  className="match"
                  onClick={() => {
                    setName(n);
                    quantityField.current?.focus();
                  }}
                >
                  <Highlight text={n} query={value} />
                </button>
                <button
                  type="button"
                  className="match-add"
                  onClick={() => {
                    props.onAdd(n);
                    setName('');
                    nameField.current?.focus();
                  }}
                  aria-label={`Add ${n}`}
                  title={`Add ${n}`}
                >
                  <Icon name="plus" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {!value && earlier.length > 0 && (
          <div className="suggestions">
            <span className="field-label">Earlier items: tap to add</span>
            <div className="chips">
              {earlier.slice(0, SUGGESTIONS).map((n) => (
                <button key={n} type="button" className="chip" onClick={() => props.onAdd(n)}>
                  <Icon name="plus" size={16} />
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="buttons">
          {props.onDelete && (
            <button
              type="button"
              className="delete"
              onClick={() => (confirmDelete ? props.onDelete?.() : setConfirmDelete(true))}
            >
              {confirmDelete ? 'Tap to delete' : 'Delete'}
            </button>
          )}
          <button type="button" onClick={props.onCancel}>
            {props.item ? 'Cancel' : 'Close'}
          </button>
          <button type="submit" className="primary" disabled={!value}>
            {props.item ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
}
