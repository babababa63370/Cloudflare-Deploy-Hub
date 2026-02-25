import { AppLayout } from "@/components/layout/app-layout";
import { useRoute } from "wouter";
import { useDeployment, useDeployAction, useToggleProxy } from "@/hooks/use-deployments";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, RefreshCw, SquareTerminal, ExternalLink, Globe, Cloud, ShieldCheck, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useRef, useEffect } from "react";
import { Switch } from "@/components/ui/switch";

export default function DeploymentDetail() {
  const [, params] = useRoute("/deployments/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  
  const { data, isLoading } = useDeployment(id);
  const deployMutation = useDeployAction();
  const proxyMutation = useToggleProxy();
  const { toast } = useToast();
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.logs]);

  const handleDeploy = async () => {
    try {
      await deployMutation.mutateAsync(id);
      toast({ title: "Deployment triggered successfully" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Action failed", description: e.message });
    }
  };

  const handleToggleProxy = async (checked: boolean) => {
    if (!data?.deployment.dnsRecordId) {
      toast({ variant: "destructive", title: "No DNS Record", description: "This deployment does not have a Cloudflare DNS record associated yet." });
      return;
    }
    
    try {
      await proxyMutation.mutateAsync({
        deploymentId: id,
        recordId: data.deployment.dnsRecordId,
        proxied: checked,
      });
      toast({ title: `Cloudflare proxy ${checked ? 'enabled' : 'disabled'}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to toggle proxy", description: e.message });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-1" />
            <Skeleton className="h-96 col-span-2" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">Deployment not found</h2>
        </div>
      </AppLayout>
    );
  }

  const { deployment, logs } = data;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-display font-bold text-foreground">{deployment.name}</h1>
            <StatusBadge status={deployment.status} />
          </div>
          <a 
            href={`https://${deployment.domain}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center text-primary hover:underline font-medium"
          >
            <Globe className="w-4 h-4 mr-1.5" />
            {deployment.domain}
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button 
            onClick={handleDeploy}
            disabled={deployMutation.isPending || deployment.status === 'running' || deployment.status === 'pending'}
            className="w-full md:w-auto hover-elevate active-elevate-2 shadow-lg shadow-primary/20"
          >
            {deployment.status === 'stopped' ? (
              <><Play className="w-4 h-4 mr-2" /> Start App</>
            ) : (
              <><RefreshCw className={`w-4 h-4 mr-2 ${deployMutation.isPending ? 'animate-spin' : ''}`} /> Re-deploy</>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Column */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-6 border-border/50">
            <h3 className="font-display font-semibold text-lg mb-4 flex items-center">
              <Cloud className="w-5 h-5 mr-2 text-muted-foreground" />
              Cloudflare DNS
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-3">
                  {deployment.isProxied ? (
                    <ShieldCheck className="w-8 h-8 text-orange-500" />
                  ) : (
                    <ShieldAlert className="w-8 h-8 text-slate-400" />
                  )}
                  <div>
                    <div className="font-semibold text-sm">Proxy Status</div>
                    <div className="text-xs text-muted-foreground">
                      {deployment.isProxied ? "Traffic protected by Cloudflare" : "DNS Only mode"}
                    </div>
                  </div>
                </div>
                <Switch 
                  checked={deployment.isProxied ?? true}
                  onCheckedChange={handleToggleProxy}
                  disabled={proxyMutation.isPending || !deployment.dnsRecordId}
                />
              </div>

              {!deployment.dnsRecordId && (
                <div className="text-xs text-amber-600 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                  DNS record has not been created yet. Save a valid Cloudflare config to automatically provision.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 border-border/50">
            <h3 className="font-display font-semibold text-lg mb-4">Configuration</h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Type</span>
                <span className="col-span-2 font-medium capitalize">{deployment.deploymentType}</span>
              </div>
              
              {deployment.deploymentType === 'local' ? (
                <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Image</span>
                  <span className="col-span-2 font-mono bg-muted px-1.5 py-0.5 rounded text-xs overflow-hidden text-ellipsis">{deployment.dockerImage}</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Repository</span>
                    <span className="col-span-2 font-medium break-all">{deployment.githubRepo}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Branch</span>
                    <span className="col-span-2 font-medium flex items-center">
                      <div className="w-2 h-2 rounded-full bg-primary mr-2" />
                      {deployment.githubBranch}
                    </span>
                  </div>
                </>
              )}
              
              <div className="grid grid-cols-3 gap-2 border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Port</span>
                <span className="col-span-2 font-medium">{deployment.port}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <span className="text-muted-foreground">Created</span>
                <span className="col-span-2 font-medium">
                  {deployment.createdAt ? format(new Date(deployment.createdAt), 'MMM d, yyyy HH:mm') : 'Unknown'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Logs Column */}
        <div className="lg:col-span-2 flex flex-col h-[600px]">
          <div className="bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col h-full shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center text-zinc-400 font-mono text-sm">
                <SquareTerminal className="w-4 h-4 mr-2" />
                Deployment Logs
              </div>
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 terminal-scrollbar text-zinc-300 font-mono text-xs leading-relaxed space-y-1.5">
              {logs.length === 0 ? (
                <div className="text-zinc-600 italic">Waiting for deployment logs...</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex gap-4 hover:bg-zinc-800/50 px-1 py-0.5 rounded">
                    <span className="text-zinc-600 shrink-0">
                      {log.createdAt ? format(new Date(log.createdAt), 'HH:mm:ss') : ''}
                    </span>
                    <span className={`${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      log.level === 'success' ? 'text-green-400' :
                      'text-zinc-300'
                    } break-all`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
