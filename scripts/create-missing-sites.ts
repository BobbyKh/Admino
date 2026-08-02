import { db } from "../lib/db/client";
import { sites } from "../lib/db/schema-postgres";

async function main() {
  const allSites = await db.select().from(sites);
  const existing = allSites.map(s => s.slug);

  const toCreate = [
    { name: "Maiti Resort", slug: "default", domain: null, plan: "free" as const },
    { name: "Anish Faancy", slug: "anish-faancy", domain: null, plan: "free" as const },
  ];

  for (const s of toCreate) {
    if (existing.includes(s.slug)) {
      console.log(`Site '${s.slug}' already exists, skipping`);
    } else {
      const [ins] = await db.insert(sites).values(s).returning();
      console.log(`Created site: id=${ins.id} slug=${s.slug}`);
    }
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
