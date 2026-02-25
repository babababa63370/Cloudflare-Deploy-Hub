import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const cloudflareConfigs = pgTable("cloudflare_configs", {
  id: serial("id").primaryKey(),
  apiToken: text("api_token").notNull(),
  zoneId: text("zone_id").notNull(),
  zoneName: text("zone_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  status: text("status").notNull(),
  deploymentType: text("deployment_type").notNull(),
  dockerImage: text("docker_image"),
  githubRepo: text("github_repo"),
  githubBranch: text("github_branch"),
  port: text("port").notNull().default("3000"),
  dnsRecordId: text("dns_record_id"),
  isProxied: boolean("is_proxied").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deploymentLogs = pgTable("deployment_logs", {
  id: serial("id").primaryKey(),
  deploymentId: serial("deployment_id").notNull().references(() => deployments.id),
  message: text("message").notNull(),
  level: text("level").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deploymentsRelations = relations(deployments, ({ many }) => ({
  logs: many(deploymentLogs),
}));

export const deploymentLogsRelations = relations(deploymentLogs, ({ one }) => ({
  deployment: one(deployments, {
    fields: [deploymentLogs.deploymentId],
    references: [deployments.id],
  }),
}));

export const insertCloudflareConfigSchema = createInsertSchema(cloudflareConfigs).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertDeploymentSchema = createInsertSchema(deployments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  dnsRecordId: true,
});

export const insertDeploymentLogSchema = createInsertSchema(deploymentLogs).omit({ 
  id: true, 
  createdAt: true 
});

export type CloudflareConfig = typeof cloudflareConfigs.$inferSelect;
export type InsertCloudflareConfig = z.infer<typeof insertCloudflareConfigSchema>;
export type CreateCloudflareConfigRequest = InsertCloudflareConfig;
export type UpdateCloudflareConfigRequest = Partial<InsertCloudflareConfig>;
export type CloudflareConfigResponse = CloudflareConfig;

export type Deployment = typeof deployments.$inferSelect;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type CreateDeploymentRequest = InsertDeployment;
export type UpdateDeploymentRequest = Partial<InsertDeployment>;
export type DeploymentResponse = Deployment;

export type DeploymentLog = typeof deploymentLogs.$inferSelect;
export type InsertDeploymentLog = z.infer<typeof insertDeploymentLogSchema>;
export type DeploymentLogResponse = DeploymentLog;

export interface DeploymentWithLogs extends Deployment {
  logs: DeploymentLog[];
}
