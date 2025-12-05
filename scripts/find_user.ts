import { storage } from "../server/storage";

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error('Usage: tsx scripts/find_user.ts <username>');
    process.exit(2);
  }

  const user = await storage.getUserByUsername(username);
  if (!user) {
    console.log('NOT_FOUND');
    process.exit(0);
  }
  console.log(JSON.stringify(user, null, 2));
}

main().catch(err => {
  console.error('ERR', err);
  process.exit(2);
});
