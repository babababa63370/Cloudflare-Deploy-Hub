import { db } from "./db";
import {
  cloudflareConfigs,
  deployments,
  deploymentLogs,
  type CreateCloudflareConfigRequest,
  type UpdateCloudflareConfigRequest,
  type CloudflareConfigResponse,
  type CreateDeploymentRequest,
  type UpdateDeploymentRequest,
  type DeploymentResponse,
  type InsertDeploymentLog,
  type DeploymentLogResponse,
  type DeploymentWithLogs,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getCloudflareConfig(): Promise<CloudflareConfigResponse | undefined>;
  createCloudflareConfig(config: CreateCloudflareConfigRequest): Promise<CloudflareConfigResponse>;
  updateCloudflareConfig(id: number, updates: UpdateCloudflareConfigRequest): Promise<CloudflareConfigResponse>;

  getDeployments(): Promise<DeploymentResponse[]>;
  getDeployment(id: number): Promise<DeploymentResponse | undefined>;
  getDeploymentWithLogs(id: number): Promise<DeploymentWithLogs | undefined>;
  createDeployment(deployment: CreateDeploymentRequest): Promise<DeploymentResponse>;
  updateDeployment(id: number, updates: UpdateDeploymentRequest): Promise<DeploymentResponse>;
  deleteDeployment(id: number): Promise<void>;

  getDeploymentLogs(deploymentId: number): Promise<DeploymentLogResponse[]>;
  addDeploymentLog(log: InsertDeploymentLog): Promise<DeploymentLogResponse>;
}

export class DatabaseStorage implements IStorage {
  async getCloudflareConfig(): Promise<CloudflareConfigResponse | undefined> {
    const configs = await db.select().from(cloudflareConfigs).limit(1);
    return configs[0];
  }

  async createCloudflareConfig(config: CreateCloudflareConfigRequest): Promise<CloudflareConfigResponse> {
    const [created] = await db.insert(cloudflareConfigs).values(config).returning();
    return created;
  }

  async updateCloudflareConfig(id: number, updates: UpdateCloudflareConfigRequest): Promise<CloudflareConfigResponse> {
    const [updated] = await db
      .update(cloudflareConfigs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cloudflareConfigs.id, id))
      .returning();
    return updated;
  }

  async getDeployments(): Promise<DeploymentResponse[]> {
    return await db.select().from(deployments).orderBy(desc(deployments.createdAt));
  }

  async getDeployment(id: number): Promise<DeploymentResponse | undefined> {
    const [deployment] = await db.select().from(deployments).where(eq(deployments.id, id));
    return deployment;
  }

  async getDeploymentWithLogs(id: number): Promise<DeploymentWithLogs | undefined> {
    const deployment = await this.getDeployment(id);
    if (!deployment) return undefined;

    const logs = await this.getDeploymentLogs(id);
    return {
      ...deployment,
      logs,
    };
  }

  async createDeployment(deployment: CreateDeploymentRequest): Promise<DeploymentResponse> {
    const [created] = await db.insert(deployments).values(deployment).returning();
    return created;
  }

  async updateDeployment(id: number, updates: UpdateDeploymentRequest): Promise<DeploymentResponse> {
    const [updated] = await db
      .update(deployments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(deployments.id, id))
      .returning();
    return updated;
  }

  async deleteDeployment(id: number): Promise<void> {
    await db.delete(deploymentLogs).where(eq(deploymentLogs.deploymentId, id));
    await db.delete(deployments).where(eq(deployments.id, id));
  }

  async getDeploymentLogs(deploymentId: number): Promise<DeploymentLogResponse[]> {
    return await db
      .select()
      .from(deploymentLogs)
      .where(eq(deploymentLogs.deploymentId, deploymentId))
      .orderBy(desc(deploymentLogs.createdAt));
  }

  async addDeploymentLog(log: InsertDeploymentLog): Promise<DeploymentLogResponse> {
    const [created] = await db.insert(deploymentLogs).values(log).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
