"use client";

import { Star } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { toggleFeatured } from "@/lib/actions/index";

export function ToggleFeaturedButton({
  id,
  featured,
}: {
  id: number;
  featured: boolean;
}) {
  return (
    <form action={toggleFeatured.bind(null, id, !featured)}>
      <FeaturedButton featured={featured} />
    </form>
  );
}

function FeaturedButton({ featured }: { featured: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      variant={featured ? "default" : "outline"}
      size="sm"
      className="gap-1.5"
    >
      <Star className={featured ? "size-3.5 fill-current" : "size-3.5"} />
      {featured ? "Featured" : "Feature"}
    </Button>
  );
}
