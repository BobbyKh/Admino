"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";

const initialState: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Globe className="size-6" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-semibold">Reset password</h1>
            <p className="text-sm text-muted-foreground">Enter your admin email and we&apos;ll send a reset link.</p>
          </div>
        </div>

        <form action={formAction} className="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="admin@admino.com" autoComplete="email" required />
          </div>

          {state?.success && (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
              If that email exists, we sent a password reset link.
            </p>
          )}
          {state?.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}

          <Button type="submit" disabled={pending} className="w-full gap-2">
            {pending ? <><Loader2 className="size-4 animate-spin" />Sending...</> : "Send reset link"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/admin/login" className="hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
