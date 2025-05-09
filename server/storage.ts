import { 
  users, 
  dataSources, 
  savedQueries, 
  dashboards, 
  dashboardItems,
  type User, 
  type InsertUser, 
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
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User related
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Data source related
  getAllDataSources(userId: number): Promise<DataSource[]>;
  getDataSource(id: number): Promise<DataSource | undefined>;
  createDataSource(dataSource: InsertDataSource): Promise<DataSource>;
  updateDataSource(id: number, dataSource: Partial<InsertDataSource>): Promise<DataSource | undefined>;
  deleteDataSource(id: number): Promise<void>;
  
  // Saved query related
  getAllSavedQueries(userId: number): Promise<SavedQuery[]>;
  getSavedQuery(id: number): Promise<SavedQuery | undefined>;
  createSavedQuery(query: InsertSavedQuery): Promise<SavedQuery>;
  updateSavedQuery(id: number, query: Partial<InsertSavedQuery>): Promise<SavedQuery | undefined>;
  deleteSavedQuery(id: number): Promise<void>;
  
  // Dashboard related
  getAllDashboards(userId: number): Promise<Dashboard[]>;
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
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private dataSources: Map<number, DataSource>;
  private savedQueries: Map<number, SavedQuery>;
  private dashboards: Map<number, Dashboard>;
  private dashboardItems: Map<number, DashboardItem>;
  private userIdCounter: number;
  private dataSourceIdCounter: number;
  private savedQueryIdCounter: number;
  private dashboardIdCounter: number;
  private dashboardItemIdCounter: number;
  public sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.dataSources = new Map();
    this.savedQueries = new Map();
    this.dashboards = new Map();
    this.dashboardItems = new Map();
    this.userIdCounter = 1;
    this.dataSourceIdCounter = 1;
    this.savedQueryIdCounter = 1;
    this.dashboardIdCounter = 1;
    this.dashboardItemIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Create default admin user
    this.createUser({
      username: "admin",
      password: "$2b$10$HhN3W1QvDjawEEAQrSQyEOiQSN8W3wDPBIzZ8qdNUEJ4ZzJIMAFii", // "password"
      email: "admin@example.com",
      fullName: "Admin User"
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
    const user: User = { ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    return user;
  }

  // Data source methods
  async getAllDataSources(userId: number): Promise<DataSource[]> {
    return Array.from(this.dataSources.values()).filter(
      (dataSource) => dataSource.userId === userId,
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
      status: "active"
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
  async getAllSavedQueries(userId: number): Promise<SavedQuery[]> {
    return Array.from(this.savedQueries.values()).filter(
      (query) => query.userId === userId,
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
      updatedAt: now
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
  async getAllDashboards(userId: number): Promise<Dashboard[]> {
    return Array.from(this.dashboards.values()).filter(
      (dashboard) => dashboard.userId === userId,
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
      updatedAt: now
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
      createdAt: now
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
