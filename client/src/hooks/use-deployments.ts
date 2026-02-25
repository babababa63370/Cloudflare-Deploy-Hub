import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type DeploymentInput, type DeploymentUpdateInput, type CreateDnsRecordInput, type ToggleProxyInput } from "@shared/routes";

export function useDeployments() {
  return useQuery({
    queryKey: [api.deployments.list.path],
    queryFn: async () => {
      const res = await fetch(api.deployments.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deployments");
      return api.deployments.list.responses[200].parse(await res.json());
    },
  });
}

export function useDeployment(id: number) {
  return useQuery({
    queryKey: [api.deployments.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.deployments.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch deployment");
      return api.deployments.get.responses[200].parse(await res.json());
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.deployment.status === "pending" || data.deployment.status === "running")) {
        return 3000; // Refetch every 3s if active
      }
      return false;
    }
  });
}

export function useCreateDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: DeploymentInput) => {
      const res = await fetch(api.deployments.create.path, {
        method: api.deployments.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create deployment");
      return api.deployments.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.deployments.list.path] });
    },
  });
}

export function useUpdateDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & DeploymentUpdateInput) => {
      const url = buildUrl(api.deployments.update.path, { id });
      const res = await fetch(url, {
        method: api.deployments.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update deployment");
      return api.deployments.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.deployments.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.deployments.get.path, variables.id] });
    },
  });
}

export function useDeleteDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.deployments.delete.path, { id });
      const res = await fetch(url, { method: api.deployments.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete deployment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.deployments.list.path] });
    },
  });
}

export function useDeployAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.deployments.deploy.path, { id });
      const res = await fetch(url, {
        method: api.deployments.deploy.method,
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to trigger deployment");
      return api.deployments.deploy.responses[200].parse(await res.json());
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.deployments.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.deployments.get.path, id] });
    },
  });
}

export function useCreateDnsRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDnsRecordInput) => {
      const res = await fetch(api.dns.createRecord.path, {
        method: api.dns.createRecord.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create DNS record");
      return api.dns.createRecord.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.deployments.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.deployments.get.path, variables.deploymentId] });
    },
  });
}

export function useToggleProxy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, deploymentId, proxied }: ToggleProxyInput & { recordId: string, deploymentId: number }) => {
      const url = buildUrl(api.dns.toggleProxy.path, { recordId });
      const res = await fetch(url, {
        method: api.dns.toggleProxy.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proxied }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle proxy");
      return api.dns.toggleProxy.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.deployments.get.path, variables.deploymentId] });
      queryClient.invalidateQueries({ queryKey: [api.deployments.list.path] });
    },
  });
}
