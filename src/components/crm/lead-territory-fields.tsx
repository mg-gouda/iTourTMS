"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("crm.territory");
  const { data: options } = trpc.crm.salesTeam.options.useQuery();
  const { data: teams } = trpc.crm.salesTeam.list.useQuery();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name={"countryId" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("country")}</FormLabel>
            <FormControl>
              <Combobox
                options={(options?.countries ?? []).map((c) => ({ value: c.id, label: c.name }))}
                value={field.value || undefined}
                onValueChange={field.onChange}
                placeholder={t("selectCountry")}
                searchPlaceholder={t("searchCountries")}
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
            <FormLabel>{t("team")}</FormLabel>
            <Select value={field.value || AUTO} onValueChange={(v) => field.onChange(v === AUTO ? "" : v)}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={AUTO}>{t("routeByCountry")}</SelectItem>
                {(teams ?? [])
                  .filter((tm) => tm.active || tm.id === field.value)
                  .map((tm) => (
                    <SelectItem key={tm.id} value={tm.id}>
                      {tm.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <FormDescription>{t("teamHint")}</FormDescription>
          </FormItem>
        )}
      />
    </div>
  );
}
