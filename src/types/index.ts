export type ModuleName = "finance" | "contracting" | "crm" | "reservations" | "traffic";

export interface ModuleDefinition {
  name: ModuleName;
  displayName: string;
  description: string;
  icon: string;
  dependencies: ModuleName[];
  isAvailable: boolean;
}
