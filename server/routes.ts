import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertDataSourceSchema, 
  insertSavedQuerySchema, 
  insertDashboardSchema, 
  insertDashboardItemSchema,
  insertOrganizationSchema,
  insertOrganizationMemberSchema 
} from "@shared/schema";
import { convertNaturalLanguageToSQL } from "./ai";
import { testDataSourceConnection, fetchSchemaFromDataSource, executeQuery } from "./data-connectors";
import { tenantIsolationMiddleware, roleCheckMiddleware } from "./middleware";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Apply tenant isolation middleware to all organization-scoped endpoints
  app.use("/api/organizations/:organizationId", tenantIsolationMiddleware);
  
  // Organization management routes
  app.get("/api/organizations/:organizationId", async (req, res, next) => {
    try {
      // Already authenticated and authorized by middleware
      res.json(req.organization);
    } catch (error) {
      next(error);
    }
  });
  
  // Create a new organization
  app.post("/api/organizations", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      const validatedData = insertOrganizationSchema.parse(req.body);
      
      // Create the organization
      const organization = await storage.createOrganization(validatedData);
      
      // Add the current user as the owner
      await storage.addOrganizationMember({
        organizationId: organization.id,
        userId: req.user.id,
        role: "owner"
      });
      
      res.status(201).json(organization);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  // Update organization
  app.patch("/api/organizations/:organizationId", 
    roleCheckMiddleware(["owner", "admin"]),
    async (req, res, next) => {
      try {
        const orgId = parseInt(req.params.organizationId);
        const updates = req.body;
        
        // Don't allow changing the slug if it's different from the current one
        if (updates.slug && updates.slug !== req.organization.slug) {
          // Check if the new slug is already taken
          const existingOrg = await storage.getOrganizationBySlug(updates.slug);
          if (existingOrg && existingOrg.id !== orgId) {
            return res.status(400).json({ message: "Organization slug already exists" });
          }
        }
        
        const validatedData = insertOrganizationSchema.partial().parse(updates);
        const updatedOrg = await storage.updateOrganization(orgId, validatedData);
        
        res.json(updatedOrg);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors });
        }
        next(error);
      }
    }
  );
  
  // Get organization members
  app.get("/api/organizations/:organizationId/members", async (req, res, next) => {
    try {
      const orgId = parseInt(req.params.organizationId);
      const members = await storage.getOrganizationMembers(orgId);
      res.json(members);
    } catch (error) {
      next(error);
    }
  });
  
  // Add a member to organization
  app.post("/api/organizations/:organizationId/members", 
    roleCheckMiddleware(["owner", "admin"]),
    async (req, res, next) => {
      try {
        const orgId = parseInt(req.params.organizationId);
        
        // Validate the username exists
        const { username, role } = req.body;
        if (!username) {
          return res.status(400).json({ message: "Username is required" });
        }
        
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        // Check if the user is already a member
        const existingMember = await storage.getOrganizationMember(orgId, user.id);
        if (existingMember) {
          return res.status(400).json({ message: "User is already a member of this organization" });
        }
        
        // Add the user to the organization
        const membership = await storage.addOrganizationMember({
          organizationId: orgId,
          userId: user.id,
          role: role || "member"
        });
        
        // Return the member with user details
        const memberWithUser = {
          ...membership,
          user
        };
        
        res.status(201).json(memberWithUser);
      } catch (error) {
        next(error);
      }
    }
  );
  
  // Update a member's role
  app.patch("/api/organizations/:organizationId/members/:userId", 
    roleCheckMiddleware(["owner"]),
    async (req, res, next) => {
      try {
        const orgId = parseInt(req.params.organizationId);
        const userId = parseInt(req.params.userId);
        const { role } = req.body;
        
        if (!role) {
          return res.status(400).json({ message: "Role is required" });
        }
        
        // Don't allow changing the role of the owner
        const member = await storage.getOrganizationMember(orgId, userId);
        if (!member) {
          return res.status(404).json({ message: "Member not found" });
        }
        
        // Check if trying to change the role of the owner
        if (member.role === "owner" && role !== "owner") {
          return res.status(403).json({ message: "Cannot change the role of the organization owner" });
        }
        
        const updatedMember = await storage.updateOrganizationMember(orgId, userId, role);
        
        res.json(updatedMember);
      } catch (error) {
        next(error);
      }
    }
  );
  
  // Remove a member from organization
  app.delete("/api/organizations/:organizationId/members/:userId", 
    roleCheckMiddleware(["owner", "admin"]),
    async (req, res, next) => {
      try {
        const orgId = parseInt(req.params.organizationId);
        const userId = parseInt(req.params.userId);
        
        // Don't allow removing the owner
        const member = await storage.getOrganizationMember(orgId, userId);
        if (!member) {
          return res.status(404).json({ message: "Member not found" });
        }
        
        if (member.role === "owner") {
          return res.status(403).json({ message: "Cannot remove the organization owner" });
        }
        
        // Also don't allow admins to remove other admins
        if (req.orgRole === "admin" && member.role === "admin") {
          return res.status(403).json({ message: "Admins cannot remove other admins" });
        }
        
        await storage.removeOrganizationMember(orgId, userId);
        
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  // Data Sources Routes - Using organizationId from req.organization
  app.get("/api/organizations/:organizationId/datasources", async (req, res, next) => {
    try {
      const orgId = parseInt(req.params.organizationId);
      const dataSources = await storage.getAllDataSources(orgId);
      res.json(dataSources);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/organizations/:organizationId/datasources", async (req, res, next) => {
    try {
      const orgId = parseInt(req.params.organizationId);
      
      const validatedData = insertDataSourceSchema.parse({
        ...req.body,
        userId: req.user.id,
        organizationId: orgId
      });
      
      // Test connection before saving
      const connectionResult = await testDataSourceConnection(validatedData);
      if (!connectionResult.success) {
        return res.status(400).json({ message: connectionResult.error });
      }
      
      const dataSource = await storage.createDataSource(validatedData);
      res.status(201).json(dataSource);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });

  app.get("/api/organizations/:organizationId/datasources/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }
      
      // Check if data source belongs to the organization
      const orgId = parseInt(req.params.organizationId);
      if (dataSource.organizationId !== orgId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(dataSource);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/organizations/:organizationId/datasources/:id", 
    roleCheckMiddleware(["owner", "admin"]),
    async (req, res, next) => {
      try {
        const id = parseInt(req.params.id);
        const dataSource = await storage.getDataSource(id);
        
        if (!dataSource) {
          return res.status(404).json({ message: "Data source not found" });
        }
        
        // Check if data source belongs to the organization
        const orgId = parseInt(req.params.organizationId);
        if (dataSource.organizationId !== orgId) {
          return res.status(403).json({ message: "Forbidden" });
        }
        
        await storage.deleteDataSource(id);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  // Schema Routes - Organization scoped
  app.get("/api/organizations/:organizationId/datasources/:id/schema", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }
      
      // Check if the datasource belongs to the organization
      const orgId = parseInt(req.params.organizationId);
      if (dataSource.organizationId !== orgId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const schema = await fetchSchemaFromDataSource(dataSource);
      res.json(schema);
    } catch (error) {
      next(error);
    }
  });

  // Query Execution Routes - Organization scoped
  app.post("/api/organizations/:organizationId/datasources/:id/execute", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }
      
      // Check if the datasource belongs to the organization
      const orgId = parseInt(req.params.organizationId);
      if (dataSource.organizationId !== orgId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }
      
      const result = await executeQuery(dataSource, query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Natural Language to SQL Routes - Organization scoped
  app.post("/api/organizations/:organizationId/datasources/:id/nlq", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }
      
      // Check if the datasource belongs to the organization
      const orgId = parseInt(req.params.organizationId);
      if (dataSource.organizationId !== orgId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const { question } = req.body;
      if (!question) {
        return res.status(400).json({ message: "Question is required" });
      }
      
      // Fetch schema for context
      const schema = await fetchSchemaFromDataSource(dataSource);
      const sqlQuery = await convertNaturalLanguageToSQL(question, schema);
      
      res.json({ sql: sqlQuery });
    } catch (error) {
      next(error);
    }
  });

  // Organization-scoped Saved Queries Routes
  app.get("/api/organizations/:organizationId/queries", async (req, res, next) => {
    try {
      const orgId = parseInt(req.params.organizationId);
      const queries = await storage.getAllSavedQueries(orgId);
      res.json(queries);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/organizations/:organizationId/queries", async (req, res, next) => {
    try {
      const orgId = parseInt(req.params.organizationId);
      
      const validatedData = insertSavedQuerySchema.parse({
        ...req.body,
        userId: req.user.id,
        organizationId: orgId
      });
      
      const savedQuery = await storage.createSavedQuery(validatedData);
      res.status(201).json(savedQuery);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  // Get a specific saved query
  app.get("/api/organizations/:organizationId/queries/:id", async (req, res, next) => {
    try {
      const queryId = parseInt(req.params.id);
      const query = await storage.getSavedQuery(queryId);
      
      if (!query) {
        return res.status(404).json({ message: "Query not found" });
      }
      
      // Check if the query belongs to the organization
      const orgId = parseInt(req.params.organizationId);
      if (query.organizationId !== orgId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(query);
    } catch (error) {
      next(error);
    }
  });
  
  // Get query versions
  app.get("/api/organizations/:organizationId/queries/:id/versions", async (req, res, next) => {
    try {
      const queryId = parseInt(req.params.id);
      const versions = await storage.getQueryVersions(queryId);
      res.json(versions);
    } catch (error) {
      next(error);
    }
  });

  // Get specific version
  app.get("/api/organizations/:organizationId/queries/:id/versions/:version", async (req, res, next) => {
    try {
      const queryId = parseInt(req.params.id);
      const version = parseInt(req.params.version);
      const queryVersion = await storage.getQueryVersion(queryId, version);
      
      if (!queryVersion) {
        return res.status(404).json({ message: "Version not found" });
      }
      
      res.json(queryVersion);
    } catch (error) {
      next(error);
    }
  });

  // Add tag to query
  app.post("/api/organizations/:organizationId/queries/:id/tags", async (req, res, next) => {
    try {
      const queryId = parseInt(req.params.id);
      const { name } = req.body;
      
      const tag = await storage.addQueryTag(queryId, name);
      res.status(201).json(tag);
    } catch (error) {
      next(error);
    }
  });

  // Update a saved query
  app.patch("/api/organizations/:organizationId/queries/:id", async (req, res, next) => {
    try {
      const queryId = parseInt(req.params.id);
      const query = await storage.getSavedQuery(queryId);
      
      if (!query) {
        return res.status(404).json({ message: "Query not found" });
      }
      
      // Check if the query belongs to the organization
      const orgId = parseInt(req.params.organizationId);
      if (query.organizationId !== orgId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Only allow the creator or admins/owners to update queries
      if (query.userId !== req.user.id && !["owner", "admin"].includes(req.orgRole)) {
        return res.status(403).json({ message: "You don't have permission to modify this query" });
      }
      
      const validatedData = insertSavedQuerySchema.partial().parse(req.body);
      const updatedQuery = await storage.updateSavedQuery(queryId, validatedData);
      
      res.json(updatedQuery);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  // Delete a saved query
  app.delete("/api/organizations/:organizationId/queries/:id", async (req, res, next) => {
    try {
      const queryId = parseInt(req.params.id);
      const query = await storage.getSavedQuery(queryId);
      
      if (!query) {
        return res.status(404).json({ message: "Query not found" });
      }
      
      // Check if the query belongs to the organization
      const orgId = parseInt(req.params.organizationId);
      if (query.organizationId !== orgId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Only allow the creator or admins/owners to delete queries
      if (query.userId !== req.user.id && !["owner", "admin"].includes(req.orgRole)) {
        return res.status(403).json({ message: "You don't have permission to delete this query" });
      }
      
      await storage.deleteSavedQuery(queryId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Organization-scoped Dashboard Routes
  app.get("/api/organizations/:organizationId/dashboards", async (req, res, next) => {
    try {
      const orgId = parseInt(req.params.organizationId);
      const dashboards = await storage.getAllDashboards(orgId);
      res.json(dashboards);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/organizations/:organizationId/dashboards", async (req, res, next) => {
    try {
      const orgId = parseInt(req.params.organizationId);
      
      const validatedData = insertDashboardSchema.parse({
        ...req.body,
        userId: req.user.id,
        organizationId: orgId
      });
      
      const dashboard = await storage.createDashboard(validatedData);
      res.status(201).json(dashboard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  // Get a specific dashboard
  app.get("/api/organizations/:organizationId/dashboards/:id", async (req, res, next) => {
    try {
      const dashboardId = parseInt(req.params.id);
      const dashboard = await storage.getDashboard(dashboardId);
      
      if (!dashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      // Check if the dashboard belongs to the organization
      const orgId = parseInt(req.params.organizationId);
      if (dashboard.organizationId !== orgId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get the dashboard items
      const items = await storage.getDashboardItems(dashboardId);
      
      res.json({
        ...dashboard,
        items
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Update a dashboard
  app.patch("/api/organizations/:organizationId/dashboards/:id", async (req, res, next) => {
    try {
      const dashboardId = parseInt(req.params.id);
      const dashboard = await storage.getDashboard(dashboardId);
      
      if (!dashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      // Check if the dashboard belongs to the organization
      const orgId = parseInt(req.params.organizationId);
      if (dashboard.organizationId !== orgId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Only allow the creator or admins/owners to update dashboards
      if (dashboard.userId !== req.user.id && !["owner", "admin"].includes(req.orgRole)) {
        return res.status(403).json({ message: "You don't have permission to modify this dashboard" });
      }
      
      const validatedData = insertDashboardSchema.partial().parse(req.body);
      const updatedDashboard = await storage.updateDashboard(dashboardId, validatedData);
      
      res.json(updatedDashboard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  // Delete a dashboard
  app.delete("/api/organizations/:organizationId/dashboards/:id", async (req, res, next) => {
    try {
      const dashboardId = parseInt(req.params.id);
      const dashboard = await storage.getDashboard(dashboardId);
      
      if (!dashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      // Check if the dashboard belongs to the organization
      const orgId = parseInt(req.params.organizationId);
      if (dashboard.organizationId !== orgId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Only allow the creator or admins/owners to delete dashboards
      if (dashboard.userId !== req.user.id && !["owner", "admin"].includes(req.orgRole)) {
        return res.status(403).json({ message: "You don't have permission to delete this dashboard" });
      }
      
      await storage.deleteDashboard(dashboardId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Dashboard Items Routes
  app.post("/api/organizations/:organizationId/dashboard-items", async (req, res, next) => {
    try {
      const orgId = parseInt(req.params.organizationId);
      
      const validatedData = insertDashboardItemSchema.parse(req.body);
      
      // Verify the dashboard exists and belongs to the organization
      const dashboard = await storage.getDashboard(validatedData.dashboardId);
      if (!dashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      if (dashboard.organizationId !== orgId) {
        return res.status(403).json({ message: "Dashboard does not belong to this organization" });
      }
      
      // Only allow the creator or admins/owners to add items to dashboards
      if (dashboard.userId !== req.user.id && !["owner", "admin"].includes(req.orgRole)) {
        return res.status(403).json({ message: "You don't have permission to modify this dashboard" });
      }
      
      const dashboardItem = await storage.createDashboardItem(validatedData);
      res.status(201).json(dashboardItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  // Update a dashboard item
  app.patch("/api/organizations/:organizationId/dashboard-items/:id", async (req, res, next) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getDashboardItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Dashboard item not found" });
      }
      
      // Check if the dashboard belongs to the organization
      const dashboard = await storage.getDashboard(item.dashboardId);
      if (!dashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      const orgId = parseInt(req.params.organizationId);
      if (dashboard.organizationId !== orgId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Only allow the dashboard creator or admins/owners to update items
      if (dashboard.userId !== req.user.id && !["owner", "admin"].includes(req.orgRole)) {
        return res.status(403).json({ message: "You don't have permission to modify this dashboard" });
      }
      
      const validatedData = insertDashboardItemSchema.partial().parse(req.body);
      const updatedItem = await storage.updateDashboardItem(itemId, validatedData);
      
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      next(error);
    }
  });
  
  // Delete a dashboard item
  app.delete("/api/organizations/:organizationId/dashboard-items/:id", async (req, res, next) => {
    try {
      const itemId = parseInt(req.params.id);
      const item = await storage.getDashboardItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Dashboard item not found" });
      }
      
      // Check if the dashboard belongs to the organization
      const dashboard = await storage.getDashboard(item.dashboardId);
      if (!dashboard) {
        return res.status(404).json({ message: "Dashboard not found" });
      }
      
      const orgId = parseInt(req.params.organizationId);
      if (dashboard.organizationId !== orgId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Only allow the dashboard creator or admins/owners to delete items
      if (dashboard.userId !== req.user.id && !["owner", "admin"].includes(req.orgRole)) {
        return res.status(403).json({ message: "You don't have permission to modify this dashboard" });
      }
      
      await storage.deleteDashboardItem(itemId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
