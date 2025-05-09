import { 
  users, 
  organizations,
  organizationMembers,
  dataSources, 
  savedQueries, 
  dashboards, 
  dashboardItems,
  type User, 
  type InsertUser,
  type Organization,
  type InsertOrganization,
  type OrganizationMember,
  type InsertOrganizationMember, 
  type DataSource, 
  type InsertDataSource,
  type SavedQuery,
  type InsertSavedQuery,
  type Dashboard,
  type InsertDashboard,
  type DashboardItem,
  type InsertDashboardItem
} from "@shared/schema";
import session from "express-session";
import type { Store } from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User related
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Organization related
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, org: Partial<InsertOrganization>): Promise<Organization | undefined>;
  deleteOrganization(id: number): Promise<void>;
  getUserOrganizations(userId: number): Promise<Organization[]>;
  
  // Organization membership related
  getOrganizationMember(organizationId: number, userId: number): Promise<OrganizationMember | undefined>;
  getOrganizationMembers(organizationId: number): Promise<(OrganizationMember & { user: User })[]>;
  addOrganizationMember(membership: InsertOrganizationMember): Promise<OrganizationMember>;
  updateOrganizationMember(organizationId: number, userId: number, role: string): Promise<OrganizationMember | undefined>;
  removeOrganizationMember(organizationId: number, userId: number): Promise<void>;
  
  // Data source related
  getAllDataSources(organizationId: number): Promise<DataSource[]>;
  getDataSource(id: number): Promise<DataSource | undefined>;
  createDataSource(dataSource: InsertDataSource): Promise<DataSource>;
  updateDataSource(id: number, dataSource: Partial<InsertDataSource>): Promise<DataSource | undefined>;
  deleteDataSource(id: number): Promise<void>;
  
  // Saved query related
  getAllSavedQueries(organizationId: number): Promise<SavedQuery[]>;
  getSavedQuery(id: number): Promise<SavedQuery | undefined>;
  createSavedQuery(query: InsertSavedQuery): Promise<SavedQuery>;
  updateSavedQuery(id: number, query: Partial<InsertSavedQuery>): Promise<SavedQuery | undefined>;
  deleteSavedQuery(id: number): Promise<void>;
  
  // Dashboard related
  getAllDashboards(organizationId: number): Promise<Dashboard[]>;
  getDashboard(id: number): Promise<Dashboard | undefined>;
  createDashboard(dashboard: InsertDashboard): Promise<Dashboard>;
  updateDashboard(id: number, dashboard: Partial<InsertDashboard>): Promise<Dashboard | undefined>;
  deleteDashboard(id: number): Promise<void>;
  
  // Dashboard items related
  getDashboardItems(dashboardId: number): Promise<DashboardItem[]>;
  createDashboardItem(item: InsertDashboardItem): Promise<DashboardItem>;
  updateDashboardItem(id: number, item: Partial<InsertDashboardItem>): Promise<DashboardItem | undefined>;
  deleteDashboardItem(id: number): Promise<void>;
  
  // Session store
  sessionStore: Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private organizations: Map<number, Organization>;
  private organizationMembers: Map<string, OrganizationMember>; // composite key: `${orgId}-${userId}`
  private dataSources: Map<number, DataSource>;
  private savedQueries: Map<number, SavedQuery>;
  private dashboards: Map<number, Dashboard>;
  private dashboardItems: Map<number, DashboardItem>;
  private userIdCounter: number;
  private organizationIdCounter: number;
  private dataSourceIdCounter: number;
  private savedQueryIdCounter: number;
  private dashboardIdCounter: number;
  private dashboardItemIdCounter: number;
  public sessionStore: Store;

  constructor() {
    this.users = new Map();
    this.organizations = new Map();
    this.organizationMembers = new Map();
    this.dataSources = new Map();
    this.savedQueries = new Map();
    this.dashboards = new Map();
    this.dashboardItems = new Map();
    this.userIdCounter = 1;
    this.organizationIdCounter = 1;
    this.dataSourceIdCounter = 1;
    this.savedQueryIdCounter = 1;
    this.dashboardIdCounter = 1;
    this.dashboardItemIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize with default data
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Create default admin user
    const adminUser = await this.createUser({
      username: "admin",
      password: "$2b$10$HhN3W1QvDjawEEAQrSQyEOiQSN8W3wDPBIzZ8qdNUEJ4ZzJIMAFii", // "password"
      email: "admin@example.com",
      fullName: "Admin User",
      role: "admin"
    });

    // Create default organization
    const defaultOrg = await this.createOrganization({
      name: "Default Organization",
      slug: "default-org",
      plan: "free",
      settings: {}
    });

    // Add admin user to default organization with owner role
    await this.addOrganizationMember({
      organizationId: defaultOrg.id,
      userId: adminUser.id,
      role: "owner"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: now,
      updatedAt: now,
      role: insertUser.role || "member",
      email: insertUser.email || null,
      fullName: insertUser.fullName || null
    };
    this.users.set(id, user);
    return user;
  }

  // Organization methods
  async getOrganization(id: number): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    return Array.from(this.organizations.values()).find(
      (org) => org.slug === slug
    );
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const id = this.organizationIdCounter++;
    const now = new Date();
    const organization: Organization = {
      ...insertOrg,
      id,
      createdAt: now,
      updatedAt: now,
      plan: insertOrg.plan || "free",
      settings: insertOrg.settings || {}
    };
    this.organizations.set(id, organization);
    return organization;
  }

  async updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const organization = this.organizations.get(id);
    if (!organization) return undefined;

    const now = new Date();
    const updatedOrganization = { 
      ...organization, 
      ...updates, 
      updatedAt: now 
    };
    this.organizations.set(id, updatedOrganization);
    return updatedOrganization;
  }

  async deleteOrganization(id: number): Promise<void> {
    // First delete all related data
    // 1. Delete all organization members
    for (const [key, member] of [...this.organizationMembers.entries()]) {
      if (member.organizationId === id) {
        this.organizationMembers.delete(key);
      }
    }

    // 2. Delete all data sources for this organization
    for (const [dsId, ds] of [...this.dataSources.entries()]) {
      if (ds.organizationId === id) {
        // Also delete related saved queries
        for (const [queryId, query] of [...this.savedQueries.entries()]) {
          if (query.dataSourceId === dsId) {
            this.savedQueries.delete(queryId);
          }
        }
        this.dataSources.delete(dsId);
      }
    }

    // 3. Delete all dashboards for this organization
    for (const [dashId, dash] of [...this.dashboards.entries()]) {
      if (dash.organizationId === id) {
        // Also delete related dashboard items
        for (const [itemId, item] of [...this.dashboardItems.entries()]) {
          if (item.dashboardId === dashId) {
            this.dashboardItems.delete(itemId);
          }
        }
        this.dashboards.delete(dashId);
      }
    }

    // Finally delete the organization itself
    this.organizations.delete(id);
  }

  async getUserOrganizations(userId: number): Promise<Organization[]> {
    // Get all organization memberships for this user
    const memberships = Array.from(this.organizationMembers.values()).filter(
      (member) => member.userId === userId
    );
    
    // Get the actual organization objects
    return memberships
      .map(membership => this.organizations.get(membership.organizationId))
      .filter((org): org is Organization => org !== undefined);
  }

  // Organization membership methods
  async getOrganizationMember(organizationId: number, userId: number): Promise<OrganizationMember | undefined> {
    const key = `${organizationId}-${userId}`;
    return this.organizationMembers.get(key);
  }

  async getOrganizationMembers(organizationId: number): Promise<(OrganizationMember & { user: User })[]> {
    // Get all members for this organization
    const members = Array.from(this.organizationMembers.values()).filter(
      (member) => member.organizationId === organizationId
    );
    
    // Join with user data
    return members.map(member => {
      const user = this.users.get(member.userId);
      return {
        ...member,
        user: user!
      };
    }).filter(item => item.user !== undefined);
  }

  async addOrganizationMember(membership: InsertOrganizationMember): Promise<OrganizationMember> {
    const key = `${membership.organizationId}-${membership.userId}`;
    const now = new Date();
    const orgMember: OrganizationMember = {
      ...membership,
      createdAt: now,
      role: membership.role || "member"
    };
    this.organizationMembers.set(key, orgMember);
    return orgMember;
  }

  async updateOrganizationMember(organizationId: number, userId: number, role: string): Promise<OrganizationMember | undefined> {
    const key = `${organizationId}-${userId}`;
    const member = this.organizationMembers.get(key);
    if (!member) return undefined;

    const updatedMember = { ...member, role };
    this.organizationMembers.set(key, updatedMember);
    return updatedMember;
  }

  async removeOrganizationMember(organizationId: number, userId: number): Promise<void> {
    const key = `${organizationId}-${userId}`;
    this.organizationMembers.delete(key);
  }

  // Data source methods
  async getAllDataSources(organizationId: number): Promise<DataSource[]> {
    return Array.from(this.dataSources.values()).filter(
      (dataSource) => dataSource.organizationId === organizationId,
    );
  }

  async getDataSource(id: number): Promise<DataSource | undefined> {
    return this.dataSources.get(id);
  }

  async createDataSource(insertDataSource: InsertDataSource): Promise<DataSource> {
    const id = this.dataSourceIdCounter++;
    const now = new Date();
    const dataSource: DataSource = { 
      ...insertDataSource, 
      id, 
      createdAt: now,
      lastSynced: now,
      status: "active",
      ssl: insertDataSource.ssl ?? false
    };
    this.dataSources.set(id, dataSource);
    return dataSource;
  }

  async updateDataSource(id: number, updates: Partial<InsertDataSource>): Promise<DataSource | undefined> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) return undefined;

    const updatedDataSource = { ...dataSource, ...updates };
    this.dataSources.set(id, updatedDataSource);
    return updatedDataSource;
  }

  async deleteDataSource(id: number): Promise<void> {
    this.dataSources.delete(id);
  }

  // Saved query methods
  async getAllSavedQueries(organizationId: number): Promise<SavedQuery[]> {
    return Array.from(this.savedQueries.values()).filter(
      (query) => query.organizationId === organizationId,
    );
  }

  async getSavedQuery(id: number): Promise<SavedQuery | undefined> {
    return this.savedQueries.get(id);
  }

  async createSavedQuery(insertQuery: InsertSavedQuery): Promise<SavedQuery> {
    const id = this.savedQueryIdCounter++;
    const now = new Date();
    const query: SavedQuery = { 
      ...insertQuery, 
      id, 
      createdAt: now,
      updatedAt: now,
      description: insertQuery.description || null,
      visualizationType: insertQuery.visualizationType || null,
      visualizationConfig: insertQuery.visualizationConfig || null
    };
    this.savedQueries.set(id, query);
    return query;
  }

  async updateSavedQuery(id: number, updates: Partial<InsertSavedQuery>): Promise<SavedQuery | undefined> {
    const query = this.savedQueries.get(id);
    if (!query) return undefined;

    const now = new Date();
    const updatedQuery = { ...query, ...updates, updatedAt: now };
    this.savedQueries.set(id, updatedQuery);
    return updatedQuery;
  }

  async deleteSavedQuery(id: number): Promise<void> {
    this.savedQueries.delete(id);
  }

  // Dashboard methods
  async getAllDashboards(organizationId: number): Promise<Dashboard[]> {
    return Array.from(this.dashboards.values()).filter(
      (dashboard) => dashboard.organizationId === organizationId,
    );
  }

  async getDashboard(id: number): Promise<Dashboard | undefined> {
    return this.dashboards.get(id);
  }

  async createDashboard(insertDashboard: InsertDashboard): Promise<Dashboard> {
    const id = this.dashboardIdCounter++;
    const now = new Date();
    const dashboard: Dashboard = { 
      ...insertDashboard, 
      id, 
      createdAt: now,
      updatedAt: now,
      description: insertDashboard.description || null,
      layout: insertDashboard.layout || null
    };
    this.dashboards.set(id, dashboard);
    return dashboard;
  }

  async updateDashboard(id: number, updates: Partial<InsertDashboard>): Promise<Dashboard | undefined> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return undefined;

    const now = new Date();
    const updatedDashboard = { ...dashboard, ...updates, updatedAt: now };
    this.dashboards.set(id, updatedDashboard);
    return updatedDashboard;
  }

  async deleteDashboard(id: number): Promise<void> {
    this.dashboards.delete(id);
  }

  // Dashboard items methods
  async getDashboardItems(dashboardId: number): Promise<DashboardItem[]> {
    return Array.from(this.dashboardItems.values()).filter(
      (item) => item.dashboardId === dashboardId,
    );
  }

  async createDashboardItem(insertItem: InsertDashboardItem): Promise<DashboardItem> {
    const id = this.dashboardItemIdCounter++;
    const now = new Date();
    const item: DashboardItem = { 
      ...insertItem, 
      id, 
      createdAt: now,
      position: insertItem.position || {} // Ensure position is not undefined
    };
    this.dashboardItems.set(id, item);
    return item;
  }

  async updateDashboardItem(id: number, updates: Partial<InsertDashboardItem>): Promise<DashboardItem | undefined> {
    const item = this.dashboardItems.get(id);
    if (!item) return undefined;

    const updatedItem = { ...item, ...updates };
    this.dashboardItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteDashboardItem(id: number): Promise<void> {
    this.dashboardItems.delete(id);
  }
}

export const storage = new MemStorage();
