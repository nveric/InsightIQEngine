import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organization/Tenant Model 
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").default("free"), // free, pro, enterprise
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  role: text("role").default("member"),  // owner, admin, member
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(), 
});

// Organization Membership Model (M:N relationship between users and organizations)
export const organizationMembers = pgTable("organization_members", {
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member"), // owner, admin, member
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    pk: primaryKey(table.organizationId, table.userId),
  };
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
  userId: integer("user_id").notNull().references(() => users.id), // Creator of the data source
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
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
  dataSourceId: integer("data_source_id").notNull().references(() => dataSources.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id), // Creator of the query
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
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
  userId: integer("user_id").notNull().references(() => users.id), // Creator of the dashboard
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  layout: jsonb("layout"), // JSON representation of the dashboard layout
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dashboard Items Model (for queries added to dashboards)
export const dashboardItems = pgTable("dashboard_items", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").notNull().references(() => dashboards.id, { onDelete: "cascade" }),
  queryId: integer("query_id").notNull().references(() => savedQueries.id, { onDelete: "cascade" }),
  position: jsonb("position"), // x, y, width, height in the dashboard grid
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations between tables
export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  dataSources: many(dataSources),
  savedQueries: many(savedQueries),
  dashboards: many(dashboards),
}));

export const usersRelations = relations(users, ({ many }) => ({
  organizations: many(organizationMembers),
  dataSources: many(dataSources),
  savedQueries: many(savedQueries),
  dashboards: many(dashboards),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

export const dataSourcesRelations = relations(dataSources, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [dataSources.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [dataSources.userId],
    references: [users.id],
  }),
  savedQueries: many(savedQueries),
}));

export const savedQueriesRelations = relations(savedQueries, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [savedQueries.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [savedQueries.userId],
    references: [users.id],
  }),
  dataSource: one(dataSources, {
    fields: [savedQueries.dataSourceId],
    references: [dataSources.id],
  }),
  dashboardItems: many(dashboardItems),
}));

export const dashboardsRelations = relations(dashboards, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [dashboards.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [dashboards.userId],
    references: [users.id],
  }),
  items: many(dashboardItems),
}));

export const dashboardItemsRelations = relations(dashboardItems, ({ one }) => ({
  dashboard: one(dashboards, {
    fields: [dashboardItems.dashboardId],
    references: [dashboards.id],
  }),
  query: one(savedQueries, {
    fields: [dashboardItems.queryId],
    references: [savedQueries.id],
  }),
}));

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).pick({
  name: true,
  slug: true,
  plan: true,
  settings: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  role: true,
});

export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).pick({
  organizationId: true,
  userId: true,
  role: true,
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
  organizationId: true,
});

export const insertSavedQuerySchema = createInsertSchema(savedQueries).pick({
  name: true,
  description: true,
  query: true,
  dataSourceId: true,
  userId: true,
  organizationId: true,
  visualizationType: true,
  visualizationConfig: true,
});

export const insertDashboardSchema = createInsertSchema(dashboards).pick({
  name: true,
  description: true,
  userId: true,
  organizationId: true,
  layout: true,
});

export const insertDashboardItemSchema = createInsertSchema(dashboardItems).pick({
  dashboardId: true,
  queryId: true,
  position: true,
});

// Export types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;

export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;

export type SavedQuery = typeof savedQueries.$inferSelect;
export type InsertSavedQuery = z.infer<typeof insertSavedQuerySchema>;

export type Dashboard = typeof dashboards.$inferSelect;
export type InsertDashboard = z.infer<typeof insertDashboardSchema>;

export type DashboardItem = typeof dashboardItems.$inferSelect;
export type InsertDashboardItem = z.infer<typeof insertDashboardItemSchema>;
