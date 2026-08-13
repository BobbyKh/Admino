"use client";

import * as React from "react";
import { getStoreCart } from "@/lib/actions/index";

const CART_CHANGED_EVENT = "admino:cart-changed";

const CartContext = React.createContext({ itemCount: 0, refreshCart: async () => {} });

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [itemCount, setItemCount] = React.useState(0);

  const refreshCart = React.useEffectEvent(async () => {
    try {
      const cart = await getStoreCart(window.localStorage.getItem("store-cart-token"));
      setItemCount(cart.itemCount);
    } catch {
      setItemCount(0);
    }
  });

  React.useEffect(() => {
    const handleChange = () => void refreshCart();
    const initialLoad = window.setTimeout(handleChange, 0);
    window.addEventListener(CART_CHANGED_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(CART_CHANGED_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  return <CartContext value={{ itemCount, refreshCart }}>{children}</CartContext>;
}

export function useCart() {
  return React.useContext(CartContext);
}

export function notifyCartChanged() {
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}
