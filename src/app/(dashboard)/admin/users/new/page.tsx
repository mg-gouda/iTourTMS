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
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PermissionGuard } from "@/components/shared/permission-guard";
import { P } from "@/lib/constants/permissions";
import { trpc } from "@/lib/trpc";
import { useTranslations } from "next-intl";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  locale: z.string().default("en"),
  roleIds: z.array(z.string()).default([]),
});

type FormValues = z.input<typeof schema>;

export default function NewUserPage() {
  const router = useRouter();
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const { data: roles } = trpc.admin.role.list.useQuery();
  const createUser = trpc.admin.user.create.useMutation({
    onSuccess: () => {
      toast.success(tc("created"));
      router.push("/admin/users");
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", locale: "en", roleIds: [] },
  });

  function onSubmit(values: FormValues) {
    createUser.mutate(values);
  }

  return (
    <PermissionGuard permission={P.SYSTEM_USER_CREATE}>
      <div className="animate-fade-in space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/users"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("newUser")}</h1>
            <p className="text-muted-foreground">{t("manageUsers")}</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Card>
              <CardHeader><CardTitle>{t("user")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tc("name")}</FormLabel>
                    <FormControl><Input {...field} placeholder="Jane Smith" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl><Input {...field} type="email" placeholder="jane@example.com" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tc("name")}</FormLabel>
                    <FormControl><Input {...field} type="password" placeholder="Min. 8 characters" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {roles && roles.length > 0 && (
              <Card>
                <CardHeader><CardTitle>{t("roles")}</CardTitle></CardHeader>
                <CardContent>
                  <FormField control={form.control} name="roleIds" render={({ field }) => (
                    <FormItem className="space-y-2">
                      {roles.map((role) => (
                        <div key={role.id} className="flex items-center gap-2">
                          <Checkbox
                            id={role.id}
                            checked={(field.value ?? []).includes(role.id)}
                            onCheckedChange={(checked) => {
                              const cur = field.value ?? [];
                              const next = checked
                                ? [...cur, role.id]
                                : cur.filter((id) => id !== role.id);
                              field.onChange(next);
                            }}
                          />
                          <label htmlFor={role.id} className="text-sm cursor-pointer">
                            <span className="font-medium">{role.displayName}</span>
                            {role.description && (
                              <span className="text-muted-foreground ml-2 text-xs">{role.description}</span>
                            )}
                          </label>
                        </div>
                      ))}
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? tc("creating") : t("newUser")}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>{tc("cancel")}</Button>
            </div>
          </form>
        </Form>
      </div>
    </PermissionGuard>
  );
}
