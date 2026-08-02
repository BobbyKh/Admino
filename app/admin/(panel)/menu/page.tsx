import { asc, eq } from "drizzle-orm";
import { UtensilsCrossed } from "lucide-react";
import { db } from "@/lib/db";
import { menuCategories, menuItems } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getMenu } from "@/lib/data";
import { deleteMenuCategory, deleteMenuItem } from "@/lib/cms-actions";
import { AddMenuItemForm } from "@/components/admin/menu-item-form";
import { AddCategoryForm } from "@/components/admin/add-category-form";
import { getAdminSiteId } from "@/lib/admin-site";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  const siteId = await getAdminSiteId();
  const [categories, menu, items] = await Promise.all([
    db.select().from(menuCategories).where(eq(menuCategories.siteId, siteId)).orderBy(asc(menuCategories.sortOrder)),
    getMenu(siteId),
    db.select().from(menuItems).where(eq(menuItems.siteId, siteId)).orderBy(asc(menuItems.sortOrder)),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Menu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage menu categories and items shown on the public menu page.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <UtensilsCrossed className="size-4 text-primary" />
          <CardTitle className="font-heading">Add category</CardTitle>
        </CardHeader>
        <CardContent>
          <AddCategoryForm />
        </CardContent>
      </Card>

      {menu.map((category) => (
        <Card key={category.id}>
          <CardHeader className="flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="font-heading">{category.name}</CardTitle>
              <Badge variant="secondary">{category.items.length} items</Badge>
            </div>
            <div className="flex items-center gap-2">
              <AddMenuItemForm categories={categories} categoryId={category.id}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  + Add item
                </Button>
              </AddMenuItemForm>
              <form action={deleteMenuCategory.bind(null, category.id)}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Delete category
                </Button>
              </form>
            </div>
          </CardHeader>
          <CardContent>
            {category.description && (
              <p className="mb-4 text-sm text-muted-foreground">
                {category.description}
              </p>
            )}
            <Separator className="mb-4" />
            {category.items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No items in this category yet.
              </p>
            ) : (
              <div className="space-y-2">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                        {item.featured && <Badge variant="secondary">Featured</Badge>}
                        {!item.available && (
                          <Badge variant="destructive">Unavailable</Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-semibold text-primary">
                        NPR {item.price}
                      </span>
                      <form action={deleteMenuItem.bind(null, item.id)}>
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {items.length} menu items across {categories.length} categories.
        </CardContent>
      </Card>
    </div>
  );
}
