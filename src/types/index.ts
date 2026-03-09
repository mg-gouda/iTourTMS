export type ModuleName = "finance" | "contracting" | "crm" | "reservations" | "traffic" | "b2c-site" | "b2b-portal";

export interface ModuleDefinition {
  name: ModuleName;
  displayName: string;
  description: string;
  icon: string;
  dependencies: ModuleName[];
  isAvailable: boolean;
}
