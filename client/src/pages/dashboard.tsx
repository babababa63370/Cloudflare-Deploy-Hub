import { Link } from "wouter";
import { Plus, Github, HardDrive, Globe, MoreVertical, Trash2, RefreshCw, Activity, Layers, UploadCloud, Rocket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { useDeployments, useDeleteDeployment, useDeployAction } from "@/hooks/use-deployments";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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

export default function Dashboard() {
  const { data: deployments, isLoading } = useDeployments();
  const { data: stats } = useQuery<{ cpuTemp: number; cpuUsage: number; memUsage: number; memTotal: number }>({ queryKey: ["/api/system/stats"] });
  const { data: containers } = useQuery<any[]>({ queryKey: ["/api/docker/containers"] });
  const deleteMutation = useDeleteDeployment();
  const deployMutation = useDeployAction();
  const { toast } = useToast();
  
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast({ title: "Déploiement supprimé" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e.message });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Raspberry Pi Mini-Cloud</h1>
        <p className="text-muted-foreground mt-1">Gérez votre serveur et vos déploiements.</p>
      </div>

      <Tabs defaultValue="status" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="status">
            <Activity className="w-4 h-4 mr-2" />
            Status
          </TabsTrigger>
          <TabsTrigger value="apps">
            <Layers className="w-4 h-4 mr-2" />
            Apps
          </TabsTrigger>
          <TabsTrigger value="deploy">
            <UploadCloud className="w-4 h-4 mr-2" />
            Deploy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">CPU Usage & Temp</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between mb-2 text-sm">
                  <span>Usage</span>
                  <span>{stats?.cpuUsage?.toFixed(1) || 0}%</span>
                </div>
                <Progress value={stats?.cpuUsage || 0} className="mb-4" />
                <div className="flex justify-between text-sm">
                  <span>Temperature</span>
                  <span className={(stats?.cpuTemp || 0) > 60 ? "text-orange-500" : "text-green-500"}>
                    {stats?.cpuTemp || 0}°C
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">RAM Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between mb-2 text-sm">
                  <span>{((stats?.memUsage || 0) / 1024 / 1024 / 1024).toFixed(2)} GB / {((stats?.memTotal || 1) / 1024 / 1024 / 1024).toFixed(2)} GB</span>
                  <span>{(((stats?.memUsage || 0) / (stats?.memTotal || 1)) * 100).toFixed(1)}%</span>
                </div>
                <Progress value={((stats?.memUsage || 0) / (stats?.memTotal || 1)) * 100} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="apps">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deployments?.map((deployment) => (
                <Card key={deployment.id} className="relative overflow-hidden group">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground">
                          {deployment.deploymentType === 'github' ? <Github className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{deployment.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">{deployment.domain}</p>
                        </div>
                      </div>
                      <StatusBadge status={deployment.status} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => toast({ title: "Démarrage..." })}>Start</Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => toast({ title: "Arrêt..." })}>Stop</Button>
                      <Button size="sm" variant="destructive" className="px-2" onClick={() => setDeleteId(deployment.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deploy">
          <Card>
            <CardHeader>
              <CardTitle>Nouveau Déploiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button asChild variant="outline" className="h-24 flex flex-col gap-2">
                  <Link href="/deployments/new">
                    <Github className="w-6 h-6" />
                    Connecter GitHub
                  </Link>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={() => toast({ title: "Bientôt disponible" })}>
                  <UploadCloud className="w-6 h-6" />
                  Upload Dossier
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer ce déploiement ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
