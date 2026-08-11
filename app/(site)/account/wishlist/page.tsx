"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCustomerWishlist, removeFromWishlist } from "@/lib/actions/customers";

interface WishlistItem {
  id: number;
  createdAt: string;
  product: {
    id: number;
    title: string;
    slug: string;
    image: string | null;
    price: number;
    currency: string;
    status: string;
  };
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getCustomerWishlist().then((data) => {
      setItems(data as WishlistItem[]);
      setLoading(false);
    });
  }, []);

  function handleRemove(wishlistId: number) {
    startTransition(async () => {
      await removeFromWishlist(wishlistId);
      setItems((prev) => prev.filter((item) => item.id !== wishlistId));
    });
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Wishlist</h2>
        <p className="text-sm text-muted-foreground">
          Items you&apos;ve saved for later.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border py-12 text-center">
          <Heart className="mx-auto mb-4 size-8 text-muted-foreground/40" />
          <p className="text-muted-foreground">Your wishlist is empty.</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="group rounded-lg border p-3">
              <Link href={`/products/${item.product.slug}`}>
                {item.product.image && (
                  <img
                    src={item.product.image}
                    alt={item.product.title}
                    className="mb-3 aspect-square w-full rounded object-cover"
                  />
                )}
                <p className="font-medium">{item.product.title}</p>
                <p className="text-sm font-semibold">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: item.product.currency.toUpperCase(),
                  }).format(item.product.price / 100)}
                </p>
              </Link>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={pending}
                  onClick={() => handleRemove(item.id)}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
