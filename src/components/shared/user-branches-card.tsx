"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";

/** Which branches a staff member works in — and so which records they can see. */
export function UserBranchesCard({
  userId,
  allBranches,
  branchIds,
  isSuperAdmin,
}: {
  userId: string;
  allBranches: boolean;
  branchIds: string[];
  isSuperAdmin: boolean;
}) {
  const utils = trpc.useUtils();
  const { data } = trpc.branch.list.useQuery();
  const [all, setAll] = useState(allBranches);
  const [picked, setPicked] = useState(branchIds);
  const saved = branchIds.join();
  useEffect(() => {
    setAll(allBranches);
    setPicked(saved ? saved.split(",") : []);
  }, [allBranches, saved]);

  const save = trpc.branch.setForUser.useMutation({
    onSuccess: () => {
      toast.success("Branch access saved");
      utils.admin.user.getById.invalidate({ id: userId });
    },
    onError: (e) => toast.error(e.message),
  });

  const branches = data?.branches.filter((b) => b.active) ?? [];
  const dirty =
    all !== allBranches ||
    picked.length !== branchIds.length ||
    picked.some((id) => !branchIds.includes(id));
  const sees = isSuperAdmin || all;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branches</CardTitle>
        <CardDescription>
          {isSuperAdmin
            ? "Super administrators see every branch."
            : sees
              ? "Sees every branch and can switch between them."
              : picked.length
                ? "Sees only the records of the branches ticked below."
                : "No branch yet — this person will see no transfers, CRM, files or books."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={sees} disabled={isSuperAdmin} onCheckedChange={setAll} />
          All branches (head-office staff)
        </label>

        <div className="flex flex-wrap gap-x-5 gap-y-2" aria-disabled={sees}>
          {branches.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                disabled={sees}
                checked={sees || picked.includes(b.id)}
                onCheckedChange={(on) =>
                  setPicked((p) => (on ? [...p, b.id] : p.filter((x) => x !== b.id)))
                }
              />
              {b.name}
              <span className="text-muted-foreground font-mono text-xs">{b.code}</span>
            </label>
          ))}
        </div>

        {!isSuperAdmin && (
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate({ userId, allBranches: all, branchIds: picked })}
            >
              {save.isPending ? "Saving…" : "Save branch access"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
