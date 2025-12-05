import { storage } from "./storage";

const exchangeNames = ["Binance", "Coinbase", "Kraken", "KuCoin", "Bybit", "OKX", "Huobi"];

function generateRandomEmail(): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "proton.me"];
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let name = "";
  for (let i = 0; i < 8 + Math.floor(Math.random() * 6); i++) {
    name += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${name}@${domains[Math.floor(Math.random() * domains.length)]}`;
}

function generateRandomPassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 12 + Math.floor(Math.random() * 6); i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function seed() {
  console.log("Seeding database...");
  console.log("This will create 1 admin + 200 users with 100 submissions each (20,000 submissions total)");
  console.log("70% of submissions will be marked as 'good'");
  console.log("This may take a few minutes...\n");

  try {
    // Create admin user Kai
    const adminExists = await storage.getUserByUsername("Kai");
    if (!adminExists) {
      await storage.createUser({
        username: "Kai",
        password: "#487530Turbo",
        role: "admin",
        isApproved: true,
        isEnabled: true,
      });
      console.log("✓ Admin user 'Kai' created");
    } else {
      console.log("✓ Admin user 'Kai' already exists");
    }

    // Create default exchanges
    const existingExchanges = await storage.getAllExchanges();
    for (const exchangeName of exchangeNames) {
      if (!existingExchanges.find(e => e.name === exchangeName)) {
        await storage.createExchange({ 
          name: exchangeName, 
          isActive: true,
          priceUsdt: (Math.random() * 50 + 10).toFixed(2)
        });
        console.log(`✓ Created exchange: ${exchangeName}`);
      }
    }

    // Create 200 users with 100 submissions each
    // 70% good, 10% pending, 10% bad, 10% wrong_password
    const getWeightedStatus = (): string => {
      const rand = Math.random();
      if (rand < 0.70) return "good";
      if (rand < 0.80) return "pending";
      if (rand < 0.90) return "bad";
      return "wrong_password";
    };
    
    for (let i = 1; i <= 200; i++) {
      const username = `user${i.toString().padStart(3, '0')}`;
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        if (i % 20 === 0) console.log(`User ${i}/200 already exists, skipping...`);
        continue;
      }
      
      // Create user
      const user = await storage.createUser({
        username,
        password: `password${i}`,
        role: "user",
        isApproved: true,
        isEnabled: true,
      });
      
      // Create 100 submissions for this user
      for (let j = 1; j <= 100; j++) {
        const exchange = exchangeNames[Math.floor(Math.random() * exchangeNames.length)];
        const status = getWeightedStatus();
        
        await storage.createSubmission({
          userId: user.id,
          email: generateRandomEmail(),
          passwordHash: generateRandomPassword(),
          exchange,
          status,
        });
      }
      
      if (i % 10 === 0) {
        console.log(`✓ Created user ${i}/200 with 100 submissions`);
      }
    }

    console.log("\n✓ Seeding complete!");
    console.log("  - 1 admin (Kai)");
    console.log("  - 200 users");
    console.log("  - 20,000 submissions (100 per user, ~70% good)");
  } catch (error) {
    console.error("Seeding error:", error);
    throw error;
  }
}

seed();
