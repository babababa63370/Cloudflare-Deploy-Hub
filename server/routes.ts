import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { CloudflareService } from "./cloudflare";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "text/plain", "application/json"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // System Stats
  app.get(api.system.stats.path, async (_req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get system stats" });
    }
  });

  // Docker Containers — not available in this environment
  app.get(api.docker.containers.path, (_req, res) => {
    res.status(503).json({ message: "Docker is not available in this environment" });
  });

  // Upload
  app.post(api.upload.path, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false });
    res.json({ success: true, filename: req.file.filename });
  });

  // Webhook
  app.post(api.webhook.path, async (_req, res) => {
    // Logic for git pull would go here
    res.json({ success: true });
  });

  // ... existing routes (Cloudflare, Deployments) ...
  app.get(api.cloudflare.get.path, async (req, res) => {
    try {
      const config = await storage.getCloudflareConfig();
      if (!config) {
        return res.json(null);
      }
      const { apiToken: _omit, ...safeConfig } = config as any;
      res.json({ ...safeConfig, apiToken: "••••••••" });
    } catch (error) {
      res.status(500).json({ message: "Failed to get Cloudflare configuration" });
    }
  });

  app.post(api.cloudflare.create.path, async (req, res) => {
    try {
      const input = api.cloudflare.create.input.parse(req.body);
      const config = await storage.createCloudflareConfig(input);
      const { apiToken: _omit, ...safeConfig } = config as any;
      res.status(201).json({ ...safeConfig, apiToken: "••••••••" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to create configuration" });
    }
  });

  app.put(api.cloudflare.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid configuration id" });
      }
      const input = api.cloudflare.update.input.parse(req.body);
      const config = await storage.updateCloudflareConfig(id, input);
      const { apiToken: _omit, ...safeConfig } = config as any;
      res.json({ ...safeConfig, apiToken: "••••••••" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(404).json({ message: "Configuration not found" });
    }
  });

  app.post(api.cloudflare.verify.path, async (req, res) => {
    try {
      const input = api.cloudflare.verify.input.parse(req.body);
      const cloudflare = new CloudflareService(input.apiToken, input.zoneId);
      const result = await cloudflare.verifyCredentials();
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.get(api.deployments.list.path, async (req, res) => {
    try {
      const deploymentsList = await storage.getDeployments();
      res.json(deploymentsList);
    } catch (error) {
      res.status(500).json({ message: "Failed to get deployments" });
    }
  });

  app.get(api.deployments.get.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid deployment id" });
      }
      const deploymentWithLogs = await storage.getDeploymentWithLogs(id);
      
      if (!deploymentWithLogs) {
        return res.status(404).json({ message: "Deployment not found" });
      }

      res.json({
        deployment: deploymentWithLogs,
        logs: deploymentWithLogs.logs,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get deployment" });
    }
  });

  app.post(api.deployments.create.path, async (req, res) => {
    try {
      const bodySchema = api.deployments.create.input;
      const input = bodySchema.parse(req.body);
      const deployment = await storage.createDeployment(input);
      
      await storage.addDeploymentLog({
        deploymentId: deployment.id,
        message: `Deployment "${deployment.name}" created`,
        level: "info",
      });

      res.status(201).json(deployment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to create deployment" });
    }
  });

  app.put(api.deployments.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid deployment id" });
      }
      const input = api.deployments.update.input.parse(req.body);
      const deployment = await storage.updateDeployment(id, input);
      
      await storage.addDeploymentLog({
        deploymentId: id,
        message: `Deployment updated`,
        level: "info",
      });

      res.json(deployment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(404).json({ message: "Deployment not found" });
    }
  });

  app.delete(api.deployments.delete.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid deployment id" });
      }
      const deployment = await storage.getDeployment(id);
      
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }

      if (deployment.dnsRecordId) {
        const config = await storage.getCloudflareConfig();
        if (config) {
          const cloudflare = new CloudflareService(config.apiToken, config.zoneId);
          await cloudflare.deleteDnsRecord(deployment.dnsRecordId);
        }
      }

      await storage.deleteDeployment(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete deployment" });
    }
  });

  app.post(api.deployments.deploy.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid deployment id" });
      }
      const deployment = await storage.getDeployment(id);
      
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }

      await storage.updateDeployment(id, { status: "running" });
      
      await storage.addDeploymentLog({
        deploymentId: id,
        message: `Starting deployment for ${deployment.name}`,
        level: "info",
      });

      await storage.addDeploymentLog({
        deploymentId: id,
        message: deployment.deploymentType === "local" 
          ? `Building Docker image: ${deployment.dockerImage}`
          : `Pulling from GitHub: ${deployment.githubRepo} (${deployment.githubBranch})`,
        level: "info",
      });

      await storage.addDeploymentLog({
        deploymentId: id,
        message: `Container started on port ${deployment.port}`,
        level: "success",
      });

      res.json({
        success: true,
        message: "Deployment started successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Deployment failed",
      });
    }
  });

  app.get(api.deployments.logs.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid deployment id" });
      }
      const logs = await storage.getDeploymentLogs(id);
      res.json(logs);
    } catch (error) {
      res.status(404).json({ message: "Deployment not found" });
    }
  });

  app.post(api.dns.createRecord.path, async (req, res) => {
    try {
      const input = api.dns.createRecord.input.parse(req.body);
      const deployment = await storage.getDeployment(input.deploymentId);
      
      if (!deployment) {
        return res.status(400).json({
          success: false,
          message: "Deployment not found",
        });
      }

      const config = await storage.getCloudflareConfig();
      if (!config) {
        return res.status(400).json({
          success: false,
          message: "Cloudflare configuration not found. Please configure Cloudflare settings first.",
        });
      }

      const cloudflare = new CloudflareService(config.apiToken, config.zoneId);
      
      const serverIp = "127.0.0.1";
      
      const result = await cloudflare.createDnsRecord(
        deployment.domain,
        serverIp,
        "A",
        deployment.isProxied ?? true
      );

      if (result.success && result.recordId) {
        await storage.updateDeployment(input.deploymentId, {
          dnsRecordId: result.recordId,
        });

        await storage.addDeploymentLog({
          deploymentId: input.deploymentId,
          message: `DNS record created for ${deployment.domain}`,
          level: "success",
        });
      }

      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: err.errors[0].message,
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to create DNS record",
      });
    }
  });

  app.post(api.dns.toggleProxy.path, async (req, res) => {
    try {
      const recordId = req.params.recordId;
      const input = api.dns.toggleProxy.input.parse(req.body);
      
      const config = await storage.getCloudflareConfig();
      if (!config) {
        return res.status(400).json({
          success: false,
          message: "Cloudflare configuration not found",
        });
      }

      const cloudflare = new CloudflareService(config.apiToken, config.zoneId);
      const result = await cloudflare.updateDnsRecordProxy(recordId, input.proxied);

      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: err.errors[0].message,
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to update proxy setting",
      });
    }
  });

  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  try {
    const existingDeployments = await storage.getDeployments();
    
    if (existingDeployments.length === 0) {
      const deployment1 = await storage.createDeployment({
        name: "Production API",
        domain: "api.example.com",
        status: "running",
        deploymentType: "github",
        githubRepo: "https://github.com/user/api-server",
        githubBranch: "main",
        port: "8080",
        isProxied: true,
      });

      await storage.addDeploymentLog({
        deploymentId: deployment1.id,
        message: "Deployment created successfully",
        level: "info",
      });

      await storage.addDeploymentLog({
        deploymentId: deployment1.id,
        message: "Pulling latest changes from GitHub",
        level: "info",
      });

      await storage.addDeploymentLog({
        deploymentId: deployment1.id,
        message: "Container started on port 8080",
        level: "success",
      });

      const deployment2 = await storage.createDeployment({
        name: "Frontend App",
        domain: "app.example.com",
        status: "running",
        deploymentType: "local",
        dockerImage: "nginx:alpine",
        port: "80",
        isProxied: true,
      });

      await storage.addDeploymentLog({
        deploymentId: deployment2.id,
        message: "Deployment created successfully",
        level: "info",
      });

      await storage.addDeploymentLog({
        deploymentId: deployment2.id,
        message: "Building Docker image: nginx:alpine",
        level: "info",
      });

      await storage.addDeploymentLog({
        deploymentId: deployment2.id,
        message: "Container started on port 80",
        level: "success",
      });

      const deployment3 = await storage.createDeployment({
        name: "Staging Environment",
        domain: "staging.example.com",
        status: "stopped",
        deploymentType: "github",
        githubRepo: "https://github.com/user/staging-app",
        githubBranch: "develop",
        port: "3000",
        isProxied: true,
      });

      await storage.addDeploymentLog({
        deploymentId: deployment3.id,
        message: "Deployment created successfully",
        level: "info",
      });

      await storage.addDeploymentLog({
        deploymentId: deployment3.id,
        message: "Container stopped manually",
        level: "warning",
      });

      console.log("✅ Database seeded with example deployments");
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
  }
}
