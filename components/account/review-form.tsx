"use client";

import { useActionState } from "react";
import { Loader2, Star } from "lucide-react";
import { submitProductReview, type ReviewFormState } from "@/lib/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ReviewFormState = {};

export function ReviewForm({ orderItemId }: { orderItemId: number }) {
  const [state, action, pending] = useActionState(submitProductReview, initialState);
  if (state.success) return <p className="text-sm font-medium text-primary" role="status">{state.message}</p>;
  return (
    <form action={action} className="mt-4 space-y-3 border-t pt-4">
      <input type="hidden" name="orderItemId" value={orderItemId} />
      <div className="space-y-2">
        <Label htmlFor={`rating-${orderItemId}`}>Rating</Label>
        <div className="flex items-center gap-2">
          <Star className="size-4 text-primary" aria-hidden="true" />
          <select id={`rating-${orderItemId}`} name="rating" defaultValue="5" className="h-9 rounded-lg border bg-background px-3 text-sm" required>
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Good</option>
            <option value="3">3 - Average</option>
            <option value="2">2 - Poor</option>
            <option value="1">1 - Very poor</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`review-title-${orderItemId}`}>Headline</Label>
        <Input id={`review-title-${orderItemId}`} name="title" maxLength={100} placeholder="Summarize your experience" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`review-body-${orderItemId}`}>Review</Label>
        <Textarea id={`review-body-${orderItemId}`} name="body" minLength={20} maxLength={1000} required placeholder="What should other customers know?" />
      </div>
      {state.message && <p className="text-sm text-destructive" role="alert">{state.message}</p>}
      <Button type="submit" disabled={pending} className="min-h-11">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Publish review
      </Button>
    </form>
  );
}
