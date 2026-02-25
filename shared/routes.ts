import { z } from 'zod';
import { 
  insertCloudflareConfigSchema, 
  insertDeploymentSchema,
  cloudflareConfigs,
  deployments,
  deploymentLogs
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  cloudflare: {
    get: {
      method: 'GET' as const,
      path: '/api/cloudflare/config' as const,
      responses: {
        200: z.custom<typeof cloudflareConfigs.$inferSelect>().nullable(),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/cloudflare/config' as const,
      input: insertCloudflareConfigSchema,
      responses: {
        201: z.custom<typeof cloudflareConfigs.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/cloudflare/config/:id' as const,
      input: insertCloudflareConfigSchema.partial(),
      responses: {
        200: z.custom<typeof cloudflareConfigs.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    verify: {
      method: 'POST' as const,
      path: '/api/cloudflare/verify' as const,
      input: z.object({
        apiToken: z.string(),
        zoneId: z.string(),
      }),
      responses: {
        200: z.object({
          valid: z.boolean(),
          zoneName: z.string().optional(),
          message: z.string(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
  deployments: {
    list: {
      method: 'GET' as const,
      path: '/api/deployments' as const,
      responses: {
        200: z.array(z.custom<typeof deployments.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/deployments/:id' as const,
      responses: {
        200: z.object({
          deployment: z.custom<typeof deployments.$inferSelect>(),
          logs: z.array(z.custom<typeof deploymentLogs.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/deployments' as const,
      input: insertDeploymentSchema,
      responses: {
        201: z.custom<typeof deployments.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/deployments/:id' as const,
      input: insertDeploymentSchema.partial(),
      responses: {
        200: z.custom<typeof deployments.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/deployments/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    deploy: {
      method: 'POST' as const,
      path: '/api/deployments/:id/deploy' as const,
      responses: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
        }),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    },
    logs: {
      method: 'GET' as const,
      path: '/api/deployments/:id/logs' as const,
      responses: {
        200: z.array(z.custom<typeof deploymentLogs.$inferSelect>()),
        404: errorSchemas.notFound,
      },
    },
  },
  dns: {
    createRecord: {
      method: 'POST' as const,
      path: '/api/dns/create' as const,
      input: z.object({
        deploymentId: z.number(),
      }),
      responses: {
        200: z.object({
          success: z.boolean(),
          recordId: z.string().optional(),
          message: z.string(),
        }),
        400: errorSchemas.validation,
      },
    },
    toggleProxy: {
      method: 'POST' as const,
      path: '/api/dns/:recordId/proxy' as const,
      input: z.object({
        proxied: z.boolean(),
      }),
      responses: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type CloudflareConfigInput = z.infer<typeof api.cloudflare.create.input>;
export type CloudflareConfigResponse = z.infer<typeof api.cloudflare.get.responses[200]>;
export type CloudflareVerifyInput = z.infer<typeof api.cloudflare.verify.input>;
export type CloudflareVerifyResponse = z.infer<typeof api.cloudflare.verify.responses[200]>;

export type DeploymentInput = z.infer<typeof api.deployments.create.input>;
export type DeploymentResponse = z.infer<typeof api.deployments.list.responses[200]>[number];
export type DeploymentWithLogsResponse = z.infer<typeof api.deployments.get.responses[200]>;
export type DeploymentUpdateInput = z.infer<typeof api.deployments.update.input>;

export type CreateDnsRecordInput = z.infer<typeof api.dns.createRecord.input>;
export type CreateDnsRecordResponse = z.infer<typeof api.dns.createRecord.responses[200]>;
export type ToggleProxyInput = z.infer<typeof api.dns.toggleProxy.input>;
export type ToggleProxyResponse = z.infer<typeof api.dns.toggleProxy.responses[200]>;
