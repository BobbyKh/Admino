"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Globe, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Globe className="size-6" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-semibold">Choose a new password</h1>
            <p className="text-sm text-muted-foreground">Use at least 10 characters.</p>
          </div>
        </div>

        {!token ? (
          <div className="rounded-2xl border bg-background p-6 text-sm text-muted-foreground shadow-sm">
            This reset link is missing a token. Request a new password reset link.
          </div>
        ) : (
          <form action={formAction} className="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
            <input type="hidden" name="token" value={token} />
            <PasswordField id="password" name="password" label="New password" autoComplete="new-password" />
            <PasswordField id="confirmPassword" name="confirmPassword" label="Confirm password" autoComplete="new-password" />

            {state?.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}

            <Button type="submit" disabled={pending} className="w-full gap-2">
              {pending ? <><Loader2 className="size-4 animate-spin" />Updating...</> : "Update password"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/admin/login" className="hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

function PasswordField({ id, name, label, autoComplete }: { id: string; name: string; label: string; autoComplete: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <LockKeyhole className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} name={name} type="password" className="pl-8" autoComplete={autoComplete} required minLength={10} />
      </div>
    </div>
  );
}
