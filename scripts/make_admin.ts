import { storage, db } from "../server/storage";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const target = "Kai";
  const newPassword = "#487530Turbo";

  // Try exact lookup first
  let user = await storage.getUserByUsername(target);

  if (!user) {
    // fallback: case-insensitive search
    const all = await storage.getAllUsers();
    user = all.find(u => u.username.toLowerCase() === target.toLowerCase());
  }

  if (!user) {
    console.error(`No user found with username '${target}'`);
    process.exit(1);
  }

  console.log(`Found user: id=${user.id} username=${user.username} role=${user.role}`);

  // Update password using existing helper
  await storage.resetUserPassword(user.id, newPassword);

  // Update role and ensure account is approved and enabled
  const [updated] = await db.update(users)
    .set({ role: "admin", isApproved: true, isEnabled: true })
    .where(eq(users.id, user.id))
    .returning();

  console.log(`Updated user: id=${updated.id} username=${updated.username} role=${updated.role} isApproved=${updated.isApproved} isEnabled=${updated.isEnabled}`);
  console.log("You can now log in as this user with the new password.");
  process.exit(0);
}

main().catch(err => {
  console.error("Error making admin:", err);
  process.exit(2);
});
