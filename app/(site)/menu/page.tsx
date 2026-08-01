import type { Metadata } from "next";
import Image from "next/image";
import { getMenu, getSiteSettings } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Explore the menu at Maiti Resort — breakfast, lunch, dinner, dessert, coffee, beer and wine. Fast food favourites in Kirtipur, Nepal.",
};

export default async function MenuPage() {
  const [menu, settings] = await Promise.all([getMenu(), getSiteSettings()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-12 text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">
          {settings.priceRange} per person
        </p>
        <h1 className="font-heading text-4xl font-semibold sm:text-5xl">
          Our Menu
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          {settings.hours} · Breakfast, lunch, dinner, dessert, coffee, beer &
          wine — dine-in, takeout or curbside pickup.
        </p>
      </div>

      <div className="space-y-16">
        {menu.map((category) => (
          <section key={category.id}>
            <div className="mb-8 flex items-end justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
                  {category.name}
                </h2>
                {category.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {category.description}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {category.items.length} items
              </Badge>
            </div>

            {category.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Coming soon — check back shortly.
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {category.items.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {item.image && (
                      <div className="relative h-44">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      </div>
                    )}
                    <CardContent className="flex flex-col gap-2 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-heading text-lg font-semibold">
                          {item.name}
                        </h3>
                        <span className="shrink-0 font-semibold text-primary">
                          NPR {item.price}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      {!item.available && (
                        <Badge variant="destructive" className="mt-1 w-fit">
                          Unavailable
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
