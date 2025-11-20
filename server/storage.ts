import { type User, type InsertUser, type QueryHistory } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  addQueryHistory(query: Omit<QueryHistory, 'id'>): Promise<QueryHistory>;
  getQueryHistory(limit?: number): Promise<QueryHistory[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private queryHistory: QueryHistory[];

  constructor() {
    this.users = new Map();
    this.queryHistory = [];
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async addQueryHistory(query: Omit<QueryHistory, 'id'>): Promise<QueryHistory> {
    const id = randomUUID();
    const history: QueryHistory = { ...query, id };
    this.queryHistory.push(history);
    return history;
  }

  async getQueryHistory(limit: number = 10): Promise<QueryHistory[]> {
    return this.queryHistory.slice(-limit).reverse();
  }
}

export const storage = new MemStorage();
