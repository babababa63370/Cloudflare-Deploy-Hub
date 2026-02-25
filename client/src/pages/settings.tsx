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
import { useCloudflareConfig, useCreateCloudflareConfig, useUpdateCloudflareConfig, useVerifyCloudflare } from "@/hooks/use-cloudflare";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Cloud, ShieldCheck, HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";

const formSchema = z.object({
  apiToken: z.string().min(10, "API Token must be valid"),
  zoneId: z.string().min(10, "Zone ID must be valid"),
  zoneName: z.string().optional(),
});

export default function Settings() {
  const { toast } = useToast();
  const { data: config, isLoading: isConfigLoading } = useCloudflareConfig();
  const createMutation = useCreateCloudflareConfig();
  const updateMutation = useUpdateCloudflareConfig(config?.id);
  const verifyMutation = useVerifyCloudflare();

  const [verifiedZoneName, setVerifiedZoneName] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiToken: "",
      zoneId: "",
      zoneName: "",
    },
  });

  // Load existing config
  useEffect(() => {
    if (config) {
      form.reset({
        apiToken: config.apiToken,
        zoneId: config.zoneId,
        zoneName: config.zoneName,
      });
      setVerifiedZoneName(config.zoneName);
    }
  }, [config, form]);

  const handleVerify = async () => {
    const values = form.getValues();
    if (!values.apiToken || !values.zoneId) {
      toast({ variant: "destructive", title: "Error", description: "Please enter both API Token and Zone ID to verify." });
      return;
    }

    try {
      const result = await verifyMutation.mutateAsync({
        apiToken: values.apiToken,
        zoneId: values.zoneId,
      });
      
      setVerifiedZoneName(result.zoneName || "Verified Zone");
      form.setValue("zoneName", result.zoneName || "Verified Zone");
      toast({ title: "Verification Successful", description: result.message });
    } catch (e: any) {
      setVerifiedZoneName(null);
      toast({ variant: "destructive", title: "Verification Failed", description: e.message });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!verifiedZoneName && !config) {
      toast({ variant: "destructive", title: "Verification required", description: "Please verify your credentials before saving." });
      return;
    }

    try {
      if (config?.id) {
        await updateMutation.mutateAsync(values);
        toast({ title: "Configuration updated successfully" });
      } else {
        await createMutation.mutateAsync(values);
        toast({ title: "Configuration saved successfully" });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to save", description: e.message });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Cloudflare Integration</h1>
          <p className="text-muted-foreground mt-1">Configure your Cloudflare account to automate DNS and SSL provisioning.</p>
        </div>

        <Card className="p-6 shadow-lg shadow-black/5 border-border/50 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 text-primary/5 pointer-events-none">
            <Cloud className="w-64 h-64" />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative z-10">
              
              <div className="bg-orange-500/10 border border-orange-500/20 text-orange-700/90 dark:text-orange-400 p-4 rounded-xl flex gap-3 text-sm">
                <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">How to get these credentials?</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Create a custom API Token in your Cloudflare Profile with <strong>Zone:DNS:Edit</strong> permissions.</li>
                    <li>Find your Zone ID on the overview page of your domain in the Cloudflare dashboard.</li>
                  </ul>
                </div>
              </div>

              <FormField
                control={form.control}
                name="apiToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Token</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••••••••••••••••••••••••••" 
                        className="bg-background font-mono" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          if(e.target.value !== config?.apiToken) setVerifiedZoneName(null);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zoneId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="023e105f4ecef8ad9ca31a8372d0c353" 
                        className="bg-background font-mono" 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if(e.target.value !== config?.zoneId) setVerifiedZoneName(null);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {verifiedZoneName && (
                <div className="flex items-center text-sm text-green-600 bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  Verified access to Zone: <strong className="ml-1">{verifiedZoneName}</strong>
                </div>
              )}

              <div className="pt-4 border-t border-border flex flex-col sm:flex-row justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleVerify}
                  disabled={verifyMutation.isPending || isConfigLoading}
                  className="w-full sm:w-auto hover-elevate"
                >
                  {verifyMutation.isPending ? "Verifying..." : "Verify Credentials"}
                </Button>
                <Button 
                  type="submit" 
                  disabled={(!verifiedZoneName && !config) || createMutation.isPending || updateMutation.isPending || isConfigLoading}
                  className="w-full sm:w-auto hover-elevate active-elevate-2 shadow-lg shadow-primary/20"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </AppLayout>
  );
}
