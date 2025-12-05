import { storage } from "../server/storage";

async function main() {
  const idStr = process.argv[2];
  if (!idStr) {
    console.error('Usage: tsx scripts/delete_user_direct.ts <id>');
    process.exit(2);
  }
  const id = parseInt(idStr, 10);
  const ok = await storage.deleteUser(id);
  console.log('DELETED:', ok);
}

main().catch(err => {
  console.error('ERR', err);
  process.exit(2);
});
