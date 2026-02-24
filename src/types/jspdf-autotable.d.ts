import "jspdf";
import type { Table } from "jspdf-autotable";

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: Table | null;
  }
}
