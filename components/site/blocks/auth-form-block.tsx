"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, Mail, User, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function AuthFormBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const mode = c.mode || "login";
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl">
            {mode === "signup" ? (c.title || "Create Account") : (c.title || "Welcome Back")}
          </CardTitle>
          <CardDescription>
            {mode === "signup"
              ? (c.subtitle || "Sign up to get started")
              : (c.subtitle || "Log in to your account")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="auth-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input id="auth-name" placeholder="John Doe" className="pl-9" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input id="auth-email" type="email" placeholder="you@example.com" className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            {mode === "login" && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-muted-foreground">Remember me</span>
                </label>
                <Link href="#" className="text-primary hover:underline">
                  {c.forgotLink || "Forgot password?"}
                </Link>
              </div>
            )}
            <Button type="submit" className="w-full">
              {mode === "signup" ? (c.submitText || "Create Account") : (c.submitText || "Sign In")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
            <Link href={c.switchLink || "#"} className="text-primary hover:underline">
              {mode === "signup" ? (c.switchText || "Sign in") : (c.switchText || "Sign up")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
