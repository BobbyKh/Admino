"use client";

import { useActionState } from "react";
import { Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sellerLogin, type SellerLoginState } from "./actions";

const initialState: SellerLoginState = {};

export function SellerLoginForm() {
  const [state, action, pending] = useActionState(sellerLogin, initialState);
  return <main className="flex min-h-svh items-center justify-center bg-slate-950 px-4 text-slate-950">
    <div className="w-full max-w-sm"><div className="mb-7 text-center text-white"><Store className="mx-auto mb-3 size-10 text-amber-400" /><h1 className="text-3xl font-semibold">Seller portal</h1><p className="mt-1 text-sm text-slate-300">Manage your store and catalog</p></div>
      <form action={action} className="space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
        <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="current-password" required /></div>
        {state.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
        <Button className="w-full" disabled={pending}>{pending && <Loader2 className="animate-spin" />}Sign in</Button>
      </form>
    </div>
  </main>;
}
