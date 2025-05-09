import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertDataSourceSchema, insertSavedQuerySchema, insertDashboardSchema, insertDashboardItemSchema } from "@shared/schema";
import { convertNaturalLanguageToSQL } from "./ai";
import { testDataSourceConnection, fetchSchemaFromDataSource, executeQuery } from "./data-connectors";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Data Sources Routes
  app.get("/api/datasources", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const dataSources = await storage.getAllDataSources(req.user.id);
      res.json(dataSources);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/datasources", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      const validatedData = insertDataSourceSchema.parse({
        ...req.body,
        userId: req.user.id
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

  app.get("/api/datasources/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }
      
      if (dataSource.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(dataSource);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/datasources/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }
      
      if (dataSource.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteDataSource(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Schema Routes
  app.get("/api/datasources/:id/schema", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }
      
      if (dataSource.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const schema = await fetchSchemaFromDataSource(dataSource);
      res.json(schema);
    } catch (error) {
      next(error);
    }
  });

  // Query Execution Routes
  app.post("/api/datasources/:id/execute", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }
      
      if (dataSource.userId !== req.user.id) {
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

  // Natural Language to SQL Routes
  app.post("/api/datasources/:id/nlq", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      const id = parseInt(req.params.id);
      const dataSource = await storage.getDataSource(id);
      
      if (!dataSource) {
        return res.status(404).json({ message: "Data source not found" });
      }
      
      if (dataSource.userId !== req.user.id) {
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

  // Saved Queries Routes
  app.get("/api/queries", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const queries = await storage.getAllSavedQueries(req.user.id);
      res.json(queries);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/queries", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      const validatedData = insertSavedQuerySchema.parse({
        ...req.body,
        userId: req.user.id
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

  // Dashboard Routes
  app.get("/api/dashboards", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      const dashboards = await storage.getAllDashboards(req.user.id);
      res.json(dashboards);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/dashboards", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      const validatedData = insertDashboardSchema.parse({
        ...req.body,
        userId: req.user.id
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

  // Dashboard Items Routes
  app.post("/api/dashboard-items", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
      
      const validatedData = insertDashboardItemSchema.parse(req.body);
      
      // Verify ownership of dashboard
      const dashboard = await storage.getDashboard(validatedData.dashboardId);
      if (!dashboard || dashboard.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
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

  const httpServer = createServer(app);
  return httpServer;
}
