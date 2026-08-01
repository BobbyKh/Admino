import Image from "next/image";
import { asc, desc } from "drizzle-orm";
import { Images, Plus, Star } from "lucide-react";
import { db } from "@/lib/db";
import { galleryImages } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { deleteGalleryImage } from "@/lib/cms-actions";
import { ToggleFeaturedButton } from "@/components/admin/toggle-featured-button";
import { GalleryImageForm } from "@/components/admin/gallery-image-form";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const rows = await db
    .select()
    .from(galleryImages)
    .orderBy(asc(galleryImages.sortOrder), desc(galleryImages.createdAt))
    .all();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Gallery</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} images · featured images appear on the home page.
          </p>
        </div>
        <GalleryImageForm>
          <Button className="gap-2">
            <Plus className="size-4" />
            Add image
          </Button>
        </GalleryImageForm>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-20 text-center">
            <Images className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No images yet. Add your first photo!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((img) => (
            <Card key={img.id} className="overflow-hidden">
              <div className="relative h-48">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {img.featured && (
                  <Badge className="absolute top-2 left-2 gap-1 bg-amber-500 text-white">
                    <Star className="size-3 fill-current" />
                    Featured
                  </Badge>
                )}
              </div>
              <CardContent className="space-y-3 p-4">
                <div>
                  <p className="font-medium">{img.title}</p>
                  <p className="text-xs text-muted-foreground">{img.category}</p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <ToggleFeaturedButton id={img.id} featured={img.featured} />
                  <form action={deleteGalleryImage.bind(null, img.id)}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </form>
                </div>
                <Separator />
                <GalleryImageForm image={img}>
                  <Button variant="outline" size="sm" className="w-full">
                    Edit details
                  </Button>
                </GalleryImageForm>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
