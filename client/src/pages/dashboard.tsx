import { Link } from "wouter";
import { Plus, Github, HardDrive, Globe, MoreVertical, Trash2, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { useDeployments, useDeleteDeployment, useDeployAction } from "@/hooks/use-deployments";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export default function Dashboard() {
  const { data: deployments, isLoading } = useDeployments();
  const deleteMutation = useDeleteDeployment();
  const deployMutation = useDeployAction();
  const { toast } = useToast();
  
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Deployment deleted successfully" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to delete", description: e.message });
    } finally {
      setDeleteId(null);
    }
  };

  const handleDeploy = async (id: number) => {
    try {
      await deployMutation.mutateAsync(id);
      toast({ title: "Deployment triggered" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to deploy", description: e.message });
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Deployments</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor your Docker applications.</p>
        </div>
        <Button asChild className="hover-elevate active-elevate-2 shadow-lg shadow-primary/20">
          <Link href="/deployments/new">
            <Plus className="w-4 h-4 mr-2" />
            New Deployment
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : deployments?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 border-2 border-dashed border-border rounded-2xl bg-muted/30">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <Rocket className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-display font-bold mb-2">No deployments yet</h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Get started by creating your first Docker deployment. You can connect a GitHub repository or use a local Docker image.
          </p>
          <Button asChild variant="outline" className="hover-elevate active-elevate-2">
            <Link href="/deployments/new">Create Deployment</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deployments?.map((deployment) => (
            <div
              key={deployment.id}
              className="bg-card border border-border/50 rounded-xl p-5 shadow-sm hover-elevate transition-all group flex flex-col h-full relative overflow-hidden"
            >
              {/* Subtle top border gradient based on status */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r 
                ${deployment.status === 'running' ? 'from-green-500/50 to-emerald-500/50' : 
                  deployment.status === 'failed' ? 'from-red-500/50 to-orange-500/50' : 
                  deployment.status === 'pending' ? 'from-amber-500/50 to-yellow-500/50' : 
                  'from-slate-500/50 to-gray-500/50'}`} 
              />
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground border border-border/50">
                    {deployment.deploymentType === 'github' ? (
                      <Github className="w-5 h-5" />
                    ) : (
                      <HardDrive className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <Link href={`/deployments/${deployment.id}`} className="font-display font-bold text-lg hover:text-primary transition-colors">
                      {deployment.name}
                    </Link>
                    <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                      <Globe className="w-3 h-3 mr-1" />
                      {deployment.domain}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href={`/deployments/${deployment.id}`}>View Details</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeploy(deployment.id)}
                      disabled={deployMutation.isPending}
                      className="cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Re-deploy
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setDeleteId(deployment.id)}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                <StatusBadge status={deployment.status} />
                <span className="text-xs text-muted-foreground">
                  Updated {deployment.updatedAt ? formatDistanceToNow(new Date(deployment.updatedAt), { addSuffix: true }) : 'never'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this deployment and stop the running containers. DNS records may need to be cleaned up manually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Deployment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

// Ensure Rocket is imported if used in empty state
import { Rocket } from "lucide-react";
