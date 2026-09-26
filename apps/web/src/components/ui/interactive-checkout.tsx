"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import {
  CreditCard,
  Minus,
  Plus,
  ShoppingCart,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  color: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface InteractiveCheckoutProps {
  products?: Product[];
  /** Controlled cart — when set, parent owns quantity state. */
  cart?: CartItem[];
  onAddToCart?: (product: Product) => void;
  onRemoveFromCart?: (productId: string) => void;
  onUpdateQuantity?: (productId: string, delta: number) => void;
  onCheckout?: () => void;
  checkoutLabel?: string;
  checkoutBusy?: boolean;
  currencyPrefix?: string;
  /** Hide the left product rail (cart-only layouts). */
  hideCatalog?: boolean;
  emptyCartMessage?: string;
  /** Optional platform fee line (e.g. Shopmi Service Fee) — shown as included split. */
  serviceFeeLabel?: string;
  serviceFeeAmount?: number;
  serviceFeeHint?: string;
  className?: string;
}

const defaultProducts: Product[] = [
  {
    id: "1",
    name: "Air Max 90",
    price: 129.99,
    category: "Running",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=80",
    color: "Black/White",
  },
  {
    id: "2",
    name: "Ultra Boost",
    price: 179.99,
    category: "Performance",
    image:
      "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=200&q=80",
    color: "Grey/Blue",
  },
  {
    id: "3",
    name: "Classic Trainer",
    price: 89.99,
    category: "Casual",
    image:
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=200&q=80",
    color: "White/Red",
  },
];

function InteractiveCheckout({
  products = defaultProducts,
  cart: controlledCart,
  onAddToCart,
  onRemoveFromCart,
  onUpdateQuantity,
  onCheckout,
  checkoutLabel = "Checkout",
  checkoutBusy = false,
  currencyPrefix = "$",
  hideCatalog = false,
  emptyCartMessage = "Your cart is empty.",
  serviceFeeLabel,
  serviceFeeAmount,
  serviceFeeHint,
  className,
}: InteractiveCheckoutProps) {
  const [internalCart, setInternalCart] = useState<CartItem[]>([]);
  const isControlled = controlledCart !== undefined;
  const cart = isControlled ? controlledCart : internalCart;

  const addToCart = (product: Product) => {
    if (onAddToCart) {
      onAddToCart(product);
      return;
    }
    setInternalCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === product.id);
      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    if (onRemoveFromCart) {
      onRemoveFromCart(productId);
      return;
    }
    setInternalCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId)
    );
  };

  const updateQuantity = (productId: string, delta: number) => {
    if (onUpdateQuantity) {
      onUpdateQuantity(productId, delta);
      return;
    }
    setInternalCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.id !== productId) return item;
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );
  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  return (
    <div className={cn("mx-auto w-full max-w-4xl", className)}>
      <div
        className={cn(
          "flex flex-col gap-6 lg:flex-row",
          hideCatalog && "lg:justify-center"
        )}
      >
        {!hideCatalog ? (
          <div className="min-w-0 flex-1 space-y-3">
            {products.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "group rounded-xl border border-border bg-card p-4",
                  "transition-all duration-200 hover:border-foreground/15"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "relative h-12 w-12 overflow-hidden rounded-lg bg-muted",
                        "transition-colors duration-200 group-hover:bg-muted/80"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-medium text-foreground">
                          {product.name}
                        </h3>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {product.category}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {currencyPrefix}
                          {product.price.toFixed(2)}
                        </span>
                        <span aria-hidden>•</span>
                        <span className="truncate">{product.color}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addToCart(product)}
                    className="shrink-0 gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            "flex w-full flex-col rounded-xl border border-border bg-card p-4",
            "sticky top-4 max-h-[32rem]",
            hideCatalog ? "mx-auto max-w-md lg:w-full lg:max-w-lg" : "lg:w-80"
          )}
        >
          <div className="mb-3 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-foreground">
              Cart ({totalItems})
            </h2>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto -mx-4 px-4">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {emptyCartMessage}
              </p>
            ) : (
              <AnimatePresence initial={false} mode="popLayout">
                {cart.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{
                      opacity: { duration: 0.2 },
                      layout: { duration: 0.2 },
                    }}
                    className="mb-3 flex items-center gap-3 rounded-lg bg-muted/50 p-2"
                  >
                    {item.image ? (
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {item.name}
                        </span>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => removeFromCart(item.id)}
                          className="rounded-md p-1 hover:bg-muted"
                          aria-label={`Remove ${item.name}`}
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </motion.button>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateQuantity(item.id, -1)}
                            className="rounded-md p-1 hover:bg-muted"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </motion.button>
                          <motion.span
                            layout
                            className="w-4 text-center text-xs text-muted-foreground"
                          >
                            {item.quantity}
                          </motion.span>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateQuantity(item.id, 1)}
                            className="rounded-md p-1 hover:bg-muted"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </motion.button>
                        </div>
                        <motion.span
                          layout
                          className="text-xs text-muted-foreground"
                        >
                          {currencyPrefix}
                          {(item.price * item.quantity).toFixed(2)}
                        </motion.span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <motion.div
            layout
            className="mt-3 border-t border-border bg-card pt-3"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-sm text-foreground">
                <span className="mr-0.5">{currencyPrefix}</span>
                <NumberFlow value={Number(totalPrice.toFixed(2))} />
              </span>
            </div>
            {serviceFeeLabel && serviceFeeAmount != null && serviceFeeAmount > 0 ? (
              <div className="mb-1.5 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {serviceFeeLabel}
                  </span>
                  <span className="text-sm text-foreground">
                    <span className="mr-0.5">{currencyPrefix}</span>
                    {serviceFeeAmount.toFixed(2)}
                  </span>
                </div>
                {serviceFeeHint ? (
                  <p className="text-[11px] text-muted-foreground">
                    {serviceFeeHint}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Total</span>
              <motion.span
                layout
                className="text-sm font-semibold text-foreground"
              >
                <span className="mr-0.5">{currencyPrefix}</span>
                <NumberFlow value={Number(totalPrice.toFixed(2))} />
              </motion.span>
            </div>
            <Button
              size="lg"
              variant="primary"
              className="h-12 w-full gap-2 text-sm sm:h-14 sm:text-base"
              disabled={cart.length === 0 || checkoutBusy}
              onClick={() => onCheckout?.()}
            >
              <CreditCard className="h-5 w-5" />
              {checkoutBusy ? "Redirecting…" : checkoutLabel}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export { InteractiveCheckout, defaultProducts };
