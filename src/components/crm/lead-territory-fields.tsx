"use client";

import type { Control, FieldValues, Path } from "react-hook-form";

import { Combobox } from "@/components/ui/combobox";
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

const AUTO = "__auto";

/**
 * Country + sales team on a lead. With no team picked, the server routes the
 * lead to the team whose markets cover the country.
 */
export function LeadTerritoryFields<T extends FieldValues>({ control }: { control: Control<T> }) {
  const { data: options } = trpc.crm.salesTeam.options.useQuery();
  const { data: teams } = trpc.crm.salesTeam.list.useQuery();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name={"countryId" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Guest country</FormLabel>
            <FormControl>
              <Combobox
                options={(options?.countries ?? []).map((c) => ({ value: c.id, label: c.name }))}
                value={field.value || undefined}
                onValueChange={field.onChange}
                placeholder="Select country"
                searchPlaceholder="Search countries…"
              />
            </FormControl>
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={"teamId" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sales team</FormLabel>
            <Select value={field.value || AUTO} onValueChange={(v) => field.onChange(v === AUTO ? "" : v)}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={AUTO}>Route by country</SelectItem>
                {(teams ?? [])
                  .filter((t) => t.active || t.id === field.value)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <FormDescription>Leave on “Route by country” to use the team whose markets cover it.</FormDescription>
          </FormItem>
        )}
      />
    </div>
  );
}
