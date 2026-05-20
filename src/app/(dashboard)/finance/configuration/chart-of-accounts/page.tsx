"use client";

import {
  ChevronDown,
  ChevronRight,
  Download,
  FilePlus2,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { AccountForm } from "@/components/finance/account-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ACCOUNT_TYPE_CATEGORIES,
  ACCOUNT_TYPE_LABELS,
} from "@/lib/constants/finance";
import {
  downloadChartOfAccountsTemplate,
  parseChartOfAccountsFile,
} from "@/lib/export/chart-of-accounts-excel";
import { trpc } from "@/lib/trpc";
import { PermissionGuard } from "@/components/shared/permission-guard";

// ── Types ────────────────────────────────────────────────────────────────────

type FlatAccount = {
  id: string;
  code: string;
  name: string;
  accountType: string;
  isGroup: boolean;
  parentId: string | null;
  reconcile: boolean;
  deprecated: boolean;
  group: { name: string } | null;
};

type TreeNode = FlatAccount & { children: TreeNode[] };

// ── Tree builder ─────────────────────────────────────────────────────────────

function buildTree(accounts: FlatAccount[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const a of accounts) map.set(a.id, { ...a, children: [] });

  const roots: TreeNode[] = [];
  for (const a of accounts) {
    const node = map.get(a.id)!;
    if (a.parentId && map.has(a.parentId)) {
      map.get(a.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code));
    for (const n of nodes) sort(n.children);
  };
  sort(roots);
  return roots;
}

const CATEGORY_SECTIONS = Object.entries(ACCOUNT_TYPE_CATEGORIES).map(
  ([name, types]) => ({ name, types: types as string[] }),
);

// ── Dialog state ─────────────────────────────────────────────────────────────

type DialogState =
  | { mode: "add"; parentId: string | null; accountType: string }
  | { mode: "edit"; account: FlatAccount }
  | null;

// ── Tree row ──────────────────────────────────────────────────────────────────

function TreeRow({
  node,
  depth,
  onAdd,
  onEdit,
  onDelete,
  search,
}: {
  node: TreeNode;
  depth: number;
  onAdd: (parentId: string, accountType: string) => void;
  onEdit: (account: FlatAccount) => void;
  onDelete: (id: string, name: string) => void;
  search: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  const matchesSearch =
    !search ||
    node.code.toLowerCase().includes(search.toLowerCase()) ||
    node.name.toLowerCase().includes(search.toLowerCase());

  // When searching, always show matching nodes (and force expand)
  const shouldShow = !search || matchesSearch || node.children.some((c) => subtreeMatches(c, search));

  if (!shouldShow) return null;

  const isExpanded = search ? true : expanded;

  return (
    <>
      <div
        className="group flex items-center gap-1 rounded px-2 py-[5px] hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {/* Expand toggle */}
        <button
          className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )
          ) : (
            <span className="size-3.5" />
          )}
        </button>

        {/* Icon */}
        {node.isGroup ? (
          <FolderOpen className="size-4 shrink-0 text-amber-500" />
        ) : (
          <FilePlus2 className="size-4 shrink-0 text-muted-foreground/60" />
        )}

        {/* Code + Name */}
        <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
          {node.code}
        </span>
        <span className={`flex-1 text-sm ${node.isGroup ? "font-semibold" : ""}`}>
          {node.name}
        </span>

        {/* Type badge (leaves only) */}
        {!node.isGroup && (
          <Badge variant="outline" className="hidden text-xs sm:flex shrink-0">
            {ACCOUNT_TYPE_LABELS[node.accountType] ?? node.accountType}
          </Badge>
        )}

        {/* Actions */}
        <div className="ml-2 flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {node.isGroup && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="h-6 w-6 text-muted-foreground"
              title="Add child account"
              onClick={() => onAdd(node.id, node.accountType)}
            >
              <Plus className="size-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            className="h-6 w-6 text-muted-foreground"
            title="Edit"
            onClick={() => onEdit(node)}
          >
            <Pencil className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="h-6 w-6 text-destructive/70 hover:text-destructive"
            title="Delete"
            onClick={() => onDelete(node.id, node.name)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {/* Children */}
      {isExpanded &&
        node.children.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
            search={search}
          />
        ))}
    </>
  );
}

function subtreeMatches(node: TreeNode, search: string): boolean {
  if (
    node.code.toLowerCase().includes(search.toLowerCase()) ||
    node.name.toLowerCase().includes(search.toLowerCase())
  )
    return true;
  return node.children.some((c) => subtreeMatches(c, search));
}

// ── Category section ──────────────────────────────────────────────────────────

function CategorySection({
  name,
  types,
  roots,
  onAdd,
  onEdit,
  onDelete,
  search,
}: {
  name: string;
  types: string[];
  roots: TreeNode[];
  onAdd: (parentId: string | null, accountType: string) => void;
  onEdit: (account: FlatAccount) => void;
  onDelete: (id: string, name: string) => void;
  search: string;
}) {
  const [open, setOpen] = useState(true);
  const nodes = roots.filter((r) => types.includes(r.accountType));

  if (nodes.length === 0 && search) return null;

  return (
    <div className="rounded-lg border bg-card">
      {/* Category header — div to avoid button-in-button nesting */}
      <div className="flex w-full items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors">
        <div
          className="flex flex-1 cursor-pointer items-center gap-2"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
          <span className="font-semibold text-sm uppercase tracking-wide text-primary">
            {name}
          </span>
          <Badge variant="secondary" className="ml-1 text-xs">
            {nodes.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => onAdd(null, types[0]!)}
        >
          <FolderPlus className="size-3" />
          Add
        </Button>
      </div>

      {/* Tree rows */}
      {open && (
        <div className="border-t pb-1">
          {nodes.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground italic">
              No accounts yet. Click Add to create one.
            </p>
          ) : (
            nodes.map((node) => (
              <TreeRow
                key={node.id}
                node={node}
                depth={0}
                onAdd={onAdd}
                onEdit={onEdit}
                onDelete={onDelete}
                search={search}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ChartOfAccountsPage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");
  const utils = trpc.useUtils();
  const { data: flat = [], isLoading } = trpc.finance.account.listTree.useQuery();
  const { data: groups = [] } = trpc.finance.account.listGroups.useQuery();

  const [dialog, setDialog] = useState<DialogState>(null);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [saveTemplateDialog, setSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const deleteMutation = trpc.finance.account.delete.useMutation({
    onSuccess: () => {
      utils.finance.account.listTree.invalidate();
      toast.success("Account deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkImportMutation = trpc.finance.account.bulkImport.useMutation({
    onSuccess: (result) => {
      utils.finance.account.listTree.invalidate();
      utils.finance.account.listGroups.invalidate();
      const parts = [];
      if (result.groupsCreated > 0) parts.push(`${result.groupsCreated} group(s) created`);
      parts.push(`${result.created} account(s) imported`);
      if (result.skipped > 0) parts.push(`${result.skipped} skipped (duplicates)`);
      if (result.unknownGroups.length > 0)
        parts.push(`unknown groups: ${result.unknownGroups.join(", ")}`);
      toast.success(parts.join(" · "));
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => setImporting(false),
  });

  const saveTemplateMutation = trpc.finance.coaTemplate.saveFromCompany.useMutation({
    onSuccess: (tpl) => {
      toast.success(`Template "${tpl.name}" saved — ${tpl._count.accounts} accounts, ${tpl._count.groups} groups`);
      setSaveTemplateDialog(false);
      setTemplateName("");
      setTemplateDesc("");
    },
    onError: (e) => toast.error(e.message),
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setImporting(true);
    const { groups: parsedGroups, rows, errors } = await parseChartOfAccountsFile(file);

    if (errors.length > 0) {
      toast.error(
        <div className="space-y-1">
          <p className="font-medium">Import errors ({errors.length}):</p>
          <ul className="list-disc pl-4 text-xs">
            {errors.slice(0, 8).map((err, i) => <li key={i}>{err}</li>)}
            {errors.length > 8 && <li>…and {errors.length - 8} more</li>}
          </ul>
        </div>,
        { duration: 8000 },
      );
      setImporting(false);
      return;
    }

    if (rows.length === 0) {
      toast.warning("No valid rows found in file.");
      setImporting(false);
      return;
    }
    bulkImportMutation.mutate({ groups: parsedGroups, rows });
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`Delete account "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate({ id });
    }
  }

  const tree = buildTree(flat);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("chartOfAccountsTitle")}</h1>
          <p className="text-muted-foreground">
            {t("chartOfAccountsDesc")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadChartOfAccountsTemplate(groups as { name: string; codePrefixStart: string; codePrefixEnd: string }[])}
          >
            <Download className="mr-2 size-4" />
            {t("template")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSaveTemplateDialog(true)}
          >
            <Save className="mr-2 size-4" />
            {t("saveAsTemplate")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 size-4" />
            {importing ? t("importing") : tc("import")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            name="accounts-import"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button size="sm" onClick={() => setDialog({ mode: "add", parentId: null, accountType: "ASSET_CURRENT" })}>
            <Plus className="mr-2 size-4" />
            {t("newAccount")}
          </Button>
        </div>
      </div>

      {/* Search */}
      <Input
        name="account-search"
        placeholder={t("searchByCodeOrName")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Tree */}
      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground">{tc("loading")}</div>
      ) : (
        <div className="space-y-3">
          {CATEGORY_SECTIONS.map((cat) => (
            <CategorySection
              key={cat.name}
              name={cat.name}
              types={cat.types}
              roots={tree}
              onAdd={(parentId, accountType) =>
                setDialog({ mode: "add", parentId, accountType })
              }
              onEdit={(account) => setDialog({ mode: "edit", account })}
              onDelete={handleDelete}
              search={search}
            />
          ))}
        </div>
      )}

      {/* Account Groups & Tags */}
      <div className="grid gap-4 md:grid-cols-2">
        <AccountGroupsPanel />
        <AccountTagsPanel />
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={!!dialog} onOpenChange={(o) => { if (!o) setDialog(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "edit" ? t("editAccount") : t("newAccount")}
            </DialogTitle>
          </DialogHeader>
          {dialog && (
            <AccountForm
              defaultValues={
                dialog.mode === "edit"
                  ? {
                      id: dialog.account.id,
                      code: dialog.account.code,
                      name: dialog.account.name,
                      accountType: dialog.account.accountType as never,
                      isGroup: dialog.account.isGroup,
                      parentId: dialog.account.parentId,
                      reconcile: dialog.account.reconcile,
                      deprecated: dialog.account.deprecated,
                      tagIds: [],
                    }
                  : {
                      parentId: dialog.parentId,
                      accountType: dialog.accountType as never,
                    }
              }
              onSuccess={() => setDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Save as Template dialog */}
      <Dialog open={saveTemplateDialog} onOpenChange={(o) => { if (!o) setSaveTemplateDialog(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("saveCoaAsTemplate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("templateName")}</label>
              <Input
                name="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Travel COA"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{tc("description")} <span className="text-muted-foreground font-normal">({tc("optional")})</span></label>
              <Input
                name="template-desc"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="e.g. Standard chart of accounts for Egyptian travel companies"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("saveTemplateHint", { count: flat.length })}
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setSaveTemplateDialog(false)}>{tc("cancel")}</Button>
              <Button
                disabled={!templateName.trim() || saveTemplateMutation.isPending}
                onClick={() => saveTemplateMutation.mutate({
                  name: templateName.trim(),
                  description: templateDesc.trim() || undefined,
                  overwrite: false,
                })}
              >
                {saveTemplateMutation.isPending ? tc("saving") : t("saveTemplate")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Account Groups panel ──────────────────────────────────────────────────────

function AccountGroupsPanel() {
  const utils = trpc.useUtils();
  const { data: groups } = trpc.finance.account.listGroups.useQuery();
  const [name, setName] = useState("");
  const [codeFrom, setCodeFrom] = useState("");
  const [codeTo, setCodeTo] = useState("");

  const createMutation = trpc.finance.account.createGroup.useMutation({
    onSuccess: () => {
      utils.finance.account.listGroups.invalidate();
      setName(""); setCodeFrom(""); setCodeTo("");
      toast.success("Group created");
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.finance.account.deleteGroup.useMutation({
    onSuccess: () => { utils.finance.account.listGroups.invalidate(); toast.success("Group deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const relinkMutation = trpc.finance.account.relinkByRange.useMutation({
    onSuccess: (r) => {
      utils.finance.account.listTree.invalidate();
      utils.finance.account.listGroups.invalidate();
      toast.success(`Re-linked ${r.linked} account(s) · ${r.skipped} unmatched`);
    },
    onError: (e) => toast.error(e.message),
  });

  const canAdd = name.trim() && codeFrom.trim() && codeTo.trim();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Account Groups</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={relinkMutation.isPending}
            onClick={() => relinkMutation.mutate({ force: false })}
          >
            {relinkMutation.isPending ? "Linking…" : "Re-link Unlinked"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[1fr_80px_80px_auto] gap-1.5 items-center">
          <Input name="group-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name…" className="h-8 text-sm" />
          <Input name="group-from" value={codeFrom} onChange={(e) => setCodeFrom(e.target.value)} placeholder="From" className="h-8 text-sm font-mono" />
          <Input name="group-to" value={codeTo} onChange={(e) => setCodeTo(e.target.value)} placeholder="To" className="h-8 text-sm font-mono" />
          <Button size="sm" className="h-8" disabled={!canAdd || createMutation.isPending}
            onClick={() => createMutation.mutate({ name: name.trim(), codePrefixStart: codeFrom.trim(), codePrefixEnd: codeTo.trim() })}>
            Add
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Code range (e.g. 1000 → 1999) is used to auto-assign accounts during import.
        </p>
        {(groups ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No account groups.</p>
        ) : (
          <div className="space-y-1">
            {(groups ?? []).map((g: { id: string; name: string; codePrefixStart: string; codePrefixEnd: string; _count: { accounts: number } }) => (
              <div key={g.id} className="flex items-center justify-between rounded border px-2 py-1 text-sm">
                <span className="flex-1 truncate">{g.name}</span>
                <span className="font-mono text-xs text-muted-foreground mx-2">{g.codePrefixStart} → {g.codePrefixEnd}</span>
                <span className="text-xs text-muted-foreground mr-2">{g._count.accounts} accts</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteMutation.mutate({ id: g.id })}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Account Tags panel ────────────────────────────────────────────────────────

function AccountTagsPanel() {
  const utils = trpc.useUtils();
  const { data: tags } = trpc.finance.account.listTags.useQuery();
  const [name, setName] = useState("");

  const createMutation = trpc.finance.account.createTag.useMutation({
    onSuccess: () => { utils.finance.account.listTags.invalidate(); setName(""); toast.success("Tag created"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.finance.account.deleteTag.useMutation({
    onSuccess: () => { utils.finance.account.listTags.invalidate(); toast.success("Tag deleted"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <PermissionGuard permission="finance:account:read">
    <Card>
      <CardHeader><CardTitle className="text-base">Account Tags</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input name="tag-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag name…" className="h-8 text-sm" />
          <Button size="sm" disabled={!name.trim() || createMutation.isPending} onClick={() => createMutation.mutate({ name: name.trim() })}>Add</Button>
        </div>
        {(tags ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No account tags.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {(tags ?? []).map((t: { id: string; name: string }) => (
              <Badge key={t.id} variant="secondary" className="gap-1">
                {t.name}
                <button className="ml-1 text-destructive hover:text-destructive/80" onClick={() => deleteMutation.mutate({ id: t.id })}>&times;</button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </PermissionGuard>
  );
}
