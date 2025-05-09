import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Data Source Model
export const dataSources = pgTable("data_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // postgresql, mysql, etc.
  host: text("host").notNull(),
  port: integer("port").notNull(),
  database: text("database").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  ssl: boolean("ssl").default(false),
  userId: integer("user_id").notNull(), // Creator of the data source
  createdAt: timestamp("created_at").defaultNow(),
  lastSynced: timestamp("last_synced"),
  status: text("status").default("active"),
});

// Saved Query Model
export const savedQueries = pgTable("saved_queries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  query: text("query").notNull(),
  dataSourceId: integer("data_source_id").notNull(),
  userId: integer("user_id").notNull(), // Creator of the query
  visualizationType: text("visualization_type"), // bar, line, pie, etc.
  visualizationConfig: jsonb("visualization_config"), // JSON configuration for the visualization
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dashboard Model
export const dashboards = pgTable("dashboards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").notNull(), // Creator of the dashboard
  layout: jsonb("layout"), // JSON representation of the dashboard layout
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dashboard Items Model (for queries added to dashboards)
export const dashboardItems = pgTable("dashboard_items", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").notNull(),
  queryId: integer("query_id").notNull(),
  position: jsonb("position"), // x, y, width, height in the dashboard grid
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
});

export const insertDataSourceSchema = createInsertSchema(dataSources).pick({
  name: true,
  type: true,
  host: true,
  port: true,
  database: true,
  username: true,
  password: true,
  ssl: true,
  userId: true,
});

export const insertSavedQuerySchema = createInsertSchema(savedQueries).pick({
  name: true,
  description: true,
  query: true,
  dataSourceId: true,
  userId: true,
  visualizationType: true,
  visualizationConfig: true,
});

export const insertDashboardSchema = createInsertSchema(dashboards).pick({
  name: true,
  description: true,
  userId: true,
  layout: true,
});

export const insertDashboardItemSchema = createInsertSchema(dashboardItems).pick({
  dashboardId: true,
  queryId: true,
  position: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;

export type SavedQuery = typeof savedQueries.$inferSelect;
export type InsertSavedQuery = z.infer<typeof insertSavedQuerySchema>;

export type Dashboard = typeof dashboards.$inferSelect;
export type InsertDashboard = z.infer<typeof insertDashboardSchema>;

export type DashboardItem = typeof dashboardItems.$inferSelect;
export type InsertDashboardItem = z.infer<typeof insertDashboardItemSchema>;
