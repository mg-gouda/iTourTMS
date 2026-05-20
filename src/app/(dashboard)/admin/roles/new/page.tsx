"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { P } from "@/lib/constants/permissions";
import { trpc } from "@/lib/trpc";
import { useTranslations } from "next-intl";

const schema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, underscores"),
  displayName: z.string().min(1, "Display name is required"),
  description: z.string().optional(),
});

type FormValues = z.input<typeof schema>;

export default function NewRolePage() {
  const router = useRouter();
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const createRole = trpc.admin.role.create.useMutation({
    onSuccess: (role) => {
      toast.success(tc("created"));
      router.push(`/admin/roles/${role.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", displayName: "", description: "" },
  });

  return (
    <PermissionGuard permission={P.SYSTEM_ROLE_CREATE}>
      <div className="animate-fade-in space-y-6 max-w-xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/roles"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("newRole")}</h1>
            <p className="text-muted-foreground">{t("manageRoles")}</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => createRole.mutate(v))} className="space-y-4">
            <Card>
              <CardHeader><CardTitle>{t("role")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tc("name")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. finance_manager" className="font-mono" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Lowercase letters, numbers, underscores only</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="displayName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("role")}</FormLabel>
                    <FormControl><Input {...field} placeholder="e.g. Finance Manager" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tc("description")}</FormLabel>
                    <FormControl><Textarea {...field} placeholder="Describe what this role can do..." rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground">
              After creating the role, you can assign permissions from the role detail page.
            </p>

            <div className="flex gap-2">
              <Button type="submit" disabled={createRole.isPending}>
                {createRole.isPending ? "Creating..." : "Create Role"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </Form>
      </div>
    </PermissionGuard>
  );
}
