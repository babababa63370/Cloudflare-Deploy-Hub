import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type CloudflareConfigInput, type CloudflareVerifyInput } from "@shared/routes";

export function useCloudflareConfig() {
  return useQuery({
    queryKey: [api.cloudflare.get.path],
    queryFn: async () => {
      const res = await fetch(api.cloudflare.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch Cloudflare config");
      return api.cloudflare.get.responses[200].parse(await res.json());
    },
  });
}

export function useCreateCloudflareConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CloudflareConfigInput) => {
      const res = await fetch(api.cloudflare.create.path, {
        method: api.cloudflare.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create Cloudflare config");
      return api.cloudflare.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cloudflare.get.path] });
    },
  });
}

export function useUpdateCloudflareConfig(id: number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<CloudflareConfigInput>) => {
      if (!id) throw new Error("No config ID provided");
      const url = api.cloudflare.update.path.replace(":id", id.toString());
      const res = await fetch(url, {
        method: api.cloudflare.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update Cloudflare config");
      return api.cloudflare.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cloudflare.get.path] });
    },
  });
}

export function useVerifyCloudflare() {
  return useMutation({
    mutationFn: async (data: CloudflareVerifyInput) => {
      const res = await fetch(api.cloudflare.verify.path, {
        method: api.cloudflare.verify.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 400) {
          const err = await res.json();
          throw new Error(err.message || "Invalid Cloudflare credentials");
        }
        throw new Error("Failed to verify Cloudflare credentials");
      }
      return api.cloudflare.verify.responses[200].parse(await res.json());
    },
  });
}
