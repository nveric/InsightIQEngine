import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, Organization, OrganizationMember } from "@shared/schema";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Extend the Express User interface to include organization data
declare global {
  namespace Express {
    interface User extends SelectUser {
      organizations?: Array<{
        organization: Organization;
        role: string;
      }>;
      currentOrganization?: Organization;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "insightiq-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      
      // Get the user's organizations
      const userOrgs = await storage.getUserOrganizations(id);
      
      // Augment the user object with organization data
      const augmentedUser = {
        ...user,
        organizations: await Promise.all(
          userOrgs.map(async (org) => {
            const membership = await storage.getOrganizationMember(org.id, user.id);
            return {
              organization: org,
              role: membership?.role || 'member'
            };
          })
        )
      };
      
      // Set the current organization to the first one if available
      if (augmentedUser.organizations && augmentedUser.organizations.length > 0) {
        augmentedUser.currentOrganization = augmentedUser.organizations[0].organization;
      }
      
      done(null, augmentedUser);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      
      // Create user with admin role for personal organization
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        role: "admin"
      });

      // Create personal organization for the user
      const personalOrgName = req.body.orgName || `${user.username}'s Workspace`;
      const personalOrgSlug = req.body.orgSlug || `${user.username}-workspace`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      
      const organization = await storage.createOrganization({
        name: personalOrgName,
        slug: personalOrgSlug,
        plan: "free",
        settings: {}
      });

      // Add user to their personal organization as owner
      await storage.addOrganizationMember({
        organizationId: organization.id,
        userId: user.id,
        role: "owner"
      });

      // Get updated user data with organization info
      const userOrgs = await storage.getUserOrganizations(user.id);
      const augmentedUser = {
        ...user,
        organizations: await Promise.all(
          userOrgs.map(async (org) => {
            const membership = await storage.getOrganizationMember(org.id, user.id);
            return {
              organization: org,
              role: membership?.role || 'member'
            };
          })
        ),
        currentOrganization: organization
      };

      req.login(augmentedUser, (err) => {
        if (err) return next(err);
        return res.status(201).json(augmentedUser);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
  
  // API to get all organizations for the current user
  app.get("/api/organizations", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      // The organizations are already loaded in the user object
      if (req.user.organizations) {
        return res.json(req.user.organizations);
      }
      
      // If not loaded, get them now
      const userOrgs = await storage.getUserOrganizations(req.user.id);
      const organizations = await Promise.all(
        userOrgs.map(async (org) => {
          const membership = await storage.getOrganizationMember(org.id, req.user.id);
          return {
            organization: org,
            role: membership?.role || 'member'
          };
        })
      );
      
      return res.json(organizations);
    } catch (error) {
      next(error);
    }
  });
  
  // API to set the current organization for the user
  app.post("/api/organizations/switch/:orgId", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      const orgId = parseInt(req.params.orgId);
      
      // Verify the user belongs to this organization
      const membership = await storage.getOrganizationMember(orgId, req.user.id);
      if (!membership) {
        return res.status(403).json({
          message: "You do not have access to this organization"
        });
      }
      
      // Get the organization
      const org = await storage.getOrganization(orgId);
      if (!org) {
        return res.status(404).json({
          message: "Organization not found"
        });
      }
      
      // Update the user's current organization in the session
      req.user.currentOrganization = org;
      
      return res.json({
        currentOrganization: org,
        role: membership.role
      });
    } catch (error) {
      next(error);
    }
  });
}
