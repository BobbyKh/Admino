import { eq } from "drizzle-orm";
import { db, closeDb } from "../lib/db/client";
import { adminUsers } from "../lib/db/schema";
import { hashPassword } from "../lib/password";

async function main() {
    const adminEmail = "admin@admino.com";
    const newPassword = "YourNewSecurePassword123"; // Set your desired password here

    const newHash = await hashPassword(newPassword);

    const updated = await db
        .update(adminUsers)
        .set({ passwordHash: newHash })
        .where(eq(adminUsers.email, adminEmail))
        .returning();

    if (updated.length > 0) {
        console.log(`✔ Updated password for: ${adminEmail}`);
    } else {
        // Insert if admin user doesn't exist yet
        await db.insert(adminUsers).values({
            name: "Admino Admin",
            email: adminEmail,
            passwordHash: newHash,
            role: "super_admin",
        });
        console.log(`✔ Created new super admin: ${adminEmail}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => closeDb(db));