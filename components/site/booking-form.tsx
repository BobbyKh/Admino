"use client";

import * as React from "react";
import { useTransition } from "react";
import { format } from "date-fns";
import { CalendarDays, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { createBooking, type BookingFormState } from "@/lib/actions";

const TIME_SLOTS = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
];

const OCCASIONS = [
  "Casual dining",
  "Birthday",
  "Anniversary",
  "Family gathering",
  "Business meeting",
  "Date",
  "Other",
];

const initialState: BookingFormState = {};

export function BookingForm() {
  const [errors, setErrors] = React.useState<BookingFormState["errors"]>({});
  const [pending, startTransition] = useTransition();
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [time, setTime] = React.useState<string>("");
  const [guests, setGuests] = React.useState<string>("2");
  const [formKey, setFormKey] = React.useState(0);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createBooking(initialState, formData);
      if (result?.success) {
        toast.success(result.message ?? "Booking received!");
        setErrors({});
        setDate(undefined);
        setTime("");
        setGuests("2");
        setFormKey((k) => k + 1);
      } else {
        setErrors(result?.errors ?? {});
        if (result?.message) toast.error(result.message);
      }
    });
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full name *</Label>
          <Input id="name" name="name" placeholder="Your name" required />
          {errors?.name && (
            <p className="text-sm text-destructive">{errors.name[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          {errors?.email && (
            <p className="text-sm text-destructive">{errors.email[0]}</p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input id="phone" name="phone" type="tel" placeholder="+977 98XXXXXXXX" required />
          {errors?.phone && (
            <p className="text-sm text-destructive">{errors.phone[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Date *</Label>
          <input type="hidden" name="date" value={date ? format(date, "yyyy-MM-dd") : ""} />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start gap-2 text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarDays className="size-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                required
              />
            </PopoverContent>
          </Popover>
          {errors?.date && (
            <p className="text-sm text-destructive">{errors.date[0]}</p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Time *</Label>
          <input type="hidden" name="time" value={time} />
          <Select value={time} onValueChange={setTime} required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a time" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {TIME_SLOTS.map((slot) => (
                <SelectItem key={slot} value={slot}>
                  {format(new Date(`2000-01-01T${slot}`), "h:mm a")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.time && (
            <p className="text-sm text-destructive">{errors.time[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="guests">Number of guests *</Label>
          <div className="relative">
            <Users className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Select value={guests} onValueChange={setGuests} required>
              <SelectTrigger className="w-full pl-8">
                <SelectValue placeholder="Guests" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 30, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} {n === 1 ? "guest" : "guests"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input type="hidden" name="guests" value={guests} />
          {errors?.guests && (
            <p className="text-sm text-destructive">{errors.guests[0]}</p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="occasion">Occasion</Label>
          <Select name="occasion">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select occasion (optional)" />
            </SelectTrigger>
            <SelectContent>
              {OCCASIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Special requests</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Any special requests (optional)"
            rows={1}
            className="resize-none"
          />
        </div>
      </div>

      <Button type="submit" disabled={pending} size="lg" className="w-full gap-2">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Submitting…
          </>
        ) : (
          "Confirm Booking Request"
        )}
      </Button>
    </form>
  );
}
