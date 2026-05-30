"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";

/* --------------------------------
   TYPES
--------------------------------- */
export type CartItem = {
  id: string;
  product_id: string;       // Product ID (this must be set)
  product_name: string;
  product_sku: string;
  main_image_url?: string;
  quantity: number;
  oem?: string;
  stock_quantity?: number;
  bundleItems?: {
    id: string;
    product_name: string;
    product_sku: string;
    main_image_url?: string;
  }[];
};

type CartContextType = {
  items: CartItem[];

  addItem: (item: CartItem) => boolean;
  addItems: (items: CartItem[]) => boolean;
  removeItem: (id: string) => void;
  clear: () => void;

  open: boolean;
  openCart: () => void;
  closeCart: () => void;

  // ✅ EXPOSE LIMIT INFO
  cartLimit: number;
  totalQuantity: number;
};

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "demo-kit-cart";

/* --------------------------------
   PROVIDER
--------------------------------- */
export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [cartLimit, setCartLimit] = useState<number>(1);

  const [userId, setUserId] = useState<string | null>(null);

  const getStorageKey = (uid: string | null) => uid ? `${STORAGE_KEY}-${uid}` : null;

  /* HANDLE AUTH & INITIAL LOAD */
  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      if (user) {
        const key = getStorageKey(user.id);
        const stored = localStorage.getItem(key!);
        if (stored) {
          try {
            setItems(JSON.parse(stored));
          } catch (e) {
            console.error("Failed to parse cart", e);
          }
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      const newUid = session?.user?.id || null;
      setUserId(newUid);

      if (newUid) {
        const key = getStorageKey(newUid);
        const stored = localStorage.getItem(key!);
        if (stored) {
          try {
            setItems(JSON.parse(stored));
          } catch (e) {
            setItems([]);
          }
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /* LOAD CART LIMIT FROM DB */
  useEffect(() => {
    fetch("/api/cart-limit")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.max_items === "number") {
          setCartLimit(data.max_items);
        }
      })
      .catch((err) => {
        console.error("Cart Limit Fetch Error:", err);
        setCartLimit(1);
      });
  }, []);

  /* SAVE CART */
  useEffect(() => {
    const key = getStorageKey(userId);
    if (key) {
      localStorage.setItem(key, JSON.stringify(items));
    }
  }, [items, userId]);

  const totalQuantity = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  /* CART ACTIONS */
  const addItems = (newItems: CartItem[]): boolean => {
    if (newItems.length === 0) return true;

    // Validate all items
    for (const item of newItems) {
      if (!item.product_id) {
        console.error("Product ID is missing in one of the items");
        alert("Product ID is missing!");
        return false;
      }
    }

    // RULE: Order must be from a single OEM
    const newOem = newItems[0].oem?.trim().toLowerCase();
    if (items.length > 0 && newOem) {
      const existingOem = items[0].oem?.trim().toLowerCase();
      if (existingOem && existingOem !== newOem) {
        toast.error(
          (t) => (
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-medium">
                There are item(s) in your existing cart. Would you want to replace them?
              </span>
              <div className="flex gap-1.5 ml-2">
                <button
                  onClick={() => {
                    setItems(newItems);
                    setOpen(true);
                    toast.dismiss(t.id);
                  }}
                  className="px-3 py-1 bg-[#213643] text-white rounded-md text-[11px] font-medium-inter hover:bg-[#1a2b35] transition-all shadow-sm"
                >
                  Yes
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium-inter hover:bg-gray-200 transition-all border border-gray-200"
                >
                  No
                </button>
              </div>
            </div>
          ),
          {
            duration: 6000,
            position: "top-right",
            style: {
              maxWidth: "100%",
              padding: "9px 11px",
            },
          }
        );
        return false; // Block adding the item
      }
    }

    // Check quantity limit for each item
    for (const item of newItems) {
      if (item.quantity > cartLimit) {
        toast.error(
          `You can only add up to ${cartLimit} unit(s) of ${item.product_name}.`
        );
        return false;
      }
    }

    setItems((prev) => {
      let updated = [...prev];
      for (const item of newItems) {
        const existingIdx = updated.findIndex((p) => p.id === item.id);
        if (existingIdx > -1) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: item.quantity,
            stock_quantity: item.stock_quantity ?? updated[existingIdx].stock_quantity,
          };
        } else {
          updated.push(item);
        }
      }
      return updated;
    });

    setOpen(true);
    return true;
  };

  const addItem = (item: CartItem): boolean => {
    return addItems([item]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  const clear = () => {
    setItems([]);
    const key = getStorageKey(userId);
    if (key) {
      localStorage.removeItem(key);
    }
    setOpen(false);
  };

  const openCart = () => setOpen(true);
  const closeCart = () => setOpen(false);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        addItems,
        removeItem,
        clear,
        open,
        openCart,
        closeCart,
        cartLimit,
        totalQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

/* HOOK */
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return ctx;
};
