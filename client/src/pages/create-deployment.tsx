import { AppLayout } from "@/components/layout/app-layout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCreateDeployment, useCreateDnsRecord } from "@/hooks/use-deployments";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Github, HardDrive } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  domain: z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Must be a valid domain name"),
  deploymentType: z.enum(["local", "github"]),
  dockerImage: z.string().optional(),
  githubRepo: z.string().optional(),
  githubBranch: z.string().optional(),
  port: z.string().default("3000"),
}).superRefine((data, ctx) => {
  if (data.deploymentType === 'local' && !data.dockerImage) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Docker Image is required for local deployments",
      path: ["dockerImage"],
    });
  }
  if (data.deploymentType === 'github' && !data.githubRepo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "GitHub Repository is required",
      path: ["githubRepo"],
    });
  }
});

export default function CreateDeployment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateDeployment();
  const dnsMutation = useCreateDnsRecord();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      domain: "",
      deploymentType: "local",
      dockerImage: "",
      githubRepo: "",
      githubBranch: "main",
      port: "3000",
    },
  });

  const deploymentType = form.watch("deploymentType");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const deployment = await createMutation.mutateAsync({
        ...values,
        status: "pending",
        isProxied: true,
      });

      toast({ title: "Deployment created successfully!" });

      // Automatically try to create DNS record
      try {
        await dnsMutation.mutateAsync({ deploymentId: deployment.id });
        toast({ title: "DNS record configured via Cloudflare" });
      } catch (dnsErr: any) {
        toast({ 
          variant: "destructive", 
          title: "DNS Setup Failed", 
          description: "You may need to configure DNS manually or check your Cloudflare settings." 
        });
      }

      setLocation(`/deployments/${deployment.id}`);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to create deployment",
        description: err.message,
      });
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">New Deployment</h1>
          <p className="text-muted-foreground mt-1">Configure your application to be deployed and proxied.</p>
        </div>

        <Card className="p-6 shadow-lg shadow-black/5 border-border/50">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <FormField
                control={form.control}
                name="deploymentType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-base">Source Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem value="local" className="peer sr-only" />
                          </FormControl>
                          <FormLabel className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all">
                            <HardDrive className="mb-3 h-6 w-6" />
                            <span className="font-semibold">Local Docker Image</span>
                            <span className="text-xs text-muted-foreground mt-1 text-center">Pull from public registry</span>
                          </FormLabel>
                        </FormItem>
                        
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem value="github" className="peer sr-only" />
                          </FormControl>
                          <FormLabel className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all">
                            <Github className="mb-3 h-6 w-6" />
                            <span className="font-semibold">GitHub Repository</span>
                            <span className="text-xs text-muted-foreground mt-1 text-center">Build from source via Webhook</span>
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Name</FormLabel>
                      <FormControl>
                        <Input placeholder="my-awesome-app" className="bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domain Name</FormLabel>
                      <FormControl>
                        <Input placeholder="app.example.com" className="bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {deploymentType === "local" ? (
                <FormField
                  control={form.control}
                  name="dockerImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Docker Image</FormLabel>
                      <FormControl>
                        <Input placeholder="nginx:latest" className="bg-background" {...field} />
                      </FormControl>
                      <FormDescription>The image to pull and run.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="githubRepo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GitHub Repository</FormLabel>
                        <FormControl>
                          <Input placeholder="username/repo" className="bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="githubBranch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch</FormLabel>
                        <FormControl>
                          <Input placeholder="main" className="bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem className="w-full md:w-1/2">
                    <FormLabel>Internal Container Port</FormLabel>
                    <FormControl>
                      <Input placeholder="3000" className="bg-background" {...field} />
                    </FormControl>
                    <FormDescription>The port your app listens on inside the container.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 border-t border-border flex justify-end">
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={createMutation.isPending}
                  className="w-full sm:w-auto hover-elevate active-elevate-2 shadow-lg shadow-primary/20"
                >
                  {createMutation.isPending ? "Creating..." : "Create Deployment"}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </AppLayout>
  );
}
