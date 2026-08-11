"use client";

import { useState, useEffect, useTransition } from "react";
import { redirect } from "next/navigation";
import { Plus, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getCustomerAddresses,
  addCustomerAddress,
  deleteCustomerAddress,
  setDefaultAddress,
} from "@/lib/actions/customers";
import type { CustomerAddress } from "@/lib/db/schema";

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    getCustomerAddresses().then((addr) => {
      setAddresses(addr);
      setLoading(false);
    });
  }, []);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addCustomerAddress({}, formData);
      if (result?.success) {
        setShowAdd(false);
        const updated = await getCustomerAddresses();
        setAddresses(updated);
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteCustomerAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    });
  }

  function handleSetDefault(id: number) {
    startTransition(async () => {
      await setDefaultAddress(id);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === id }))
      );
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Addresses</h2>
          <p className="text-sm text-muted-foreground">
            Manage your saved addresses for faster checkout.
          </p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="size-4" />
              Add Address
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Address</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input name="label" placeholder="Home, Work, etc." />
              </div>
              <div className="space-y-1.5">
                <Label>Address Line 1 *</Label>
                <Input name="line1" required placeholder="Street address" />
              </div>
              <div className="space-y-1.5">
                <Label>Address Line 2</Label>
                <Input name="line2" placeholder="Apt, suite, etc." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>City *</Label>
                  <Input name="city" required />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input name="state" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Postal Code</Label>
                  <Input name="postalCode" />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input name="country" defaultValue="US" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isDefault" className="rounded" />
                Set as default address
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  Save
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-lg border py-12 text-center">
          <p className="text-muted-foreground">No saved addresses.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((addr) => (
            <Card key={addr.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{addr.label}</CardTitle>
                  {addr.isDefault && (
                    <span className="flex items-center gap-1 text-xs text-primary">
                      <Star className="size-3 fill-primary" />
                      Default
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">
                  {addr.line1}
                  {addr.line2 && <>, {addr.line2}</>}
                  <br />
                  {addr.city}
                  {addr.state && <>, {addr.state}</>}
                  {addr.postalCode && <> {addr.postalCode}</>}
                  <br />
                  {addr.country}
                </p>
                <div className="flex gap-2">
                  {!addr.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => handleSetDefault(addr.id)}
                    >
                      Set as default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={pending}
                    onClick={() => handleDelete(addr.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
