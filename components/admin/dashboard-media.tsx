import { count, and, eq, countDistinct } from "drizzle-orm";
import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { galleryImages } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminSiteId } from "@/lib/admin-site";

export async function DashboardMedia() {
  const siteId = await getAdminSiteId();

  const [galleryCount, featuredCount, categoryCount] = await Promise.all([
    db.select({ value: count() }).from(galleryImages).where(eq(galleryImages.siteId, siteId)),
    db.select({ value: count() }).from(galleryImages).where(and(eq(galleryImages.siteId, siteId), eq(galleryImages.featured, true))),
    db.select({ value: countDistinct(galleryImages.category) }).from(galleryImages).where(eq(galleryImages.siteId, siteId)),
  ]);

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <Star className="size-4 text-amber-500" />
        <CardTitle className="font-heading">Media</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="flex justify-between">
          <span className="text-muted-foreground">Gallery images</span>
          <span className="font-medium">{galleryCount[0]?.value ?? 0}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-muted-foreground">Featured</span>
          <span className="font-medium">{featuredCount[0]?.value ?? 0}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-muted-foreground">Categories</span>
          <span className="font-medium">{categoryCount[0]?.value ?? 0}</span>
        </p>
      </CardContent>
    </Card>
  );
}
