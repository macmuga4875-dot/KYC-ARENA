import { storage } from "../server/storage";

async function main() {
  const username = process.argv[2] || 'test_auto_user_1';
  const password = process.argv[3] || 'testpass123';

  // Try to avoid duplicate
  const existing = await storage.getUserByUsername(username);
  if (existing) {
    console.log('ALREADY_EXISTS', JSON.stringify(existing, null, 2));
    process.exit(0);
  }

  const created = await storage.createUser({ username, password });
  console.log(JSON.stringify(created, null, 2));
}

main().catch(err => {
  console.error('ERR', err);
  process.exit(2);
});
