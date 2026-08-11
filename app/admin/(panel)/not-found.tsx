import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <FileQuestion className="mb-4 size-12 text-muted-foreground" />
      <h1 className="mb-2 text-2xl font-bold">Page not found</h1>
      <p className="mb-6 text-muted-foreground">
        The admin page you are looking for does not exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/admin">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
