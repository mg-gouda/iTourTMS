import type { HelpModule } from "./types";

export const tourOpsHelp: HelpModule = {
  slug: "tour-ops",
  name: "Tour Operations",
  icon: "FolderOpen",
  color: "indigo",
  description: "Tour file management, package builder, quotations, management fees, credit limit enforcement, P&L tracking, and cross-module dispatch.",
  overview:
    "The Tour Operations module manages the full lifecycle of group and FIT tour programs. You create tour files, build package templates with accommodation, transport, and excursions, generate client quotations with margin and management fee control, enforce tour operator credit limits with an Operations Manager override flow, track actual vs budgeted costs, and dispatch components to the Reservations and Traffic modules.",
  sections: [
    {
      id: "tour-files",
      title: "Tour Files",
      description:
        "A tour file is the operational record for a group or FIT program. It aggregates all services and tracks actual costs and revenues.",
      features: [
        "File code auto-generated (FI-XXXXX sequence)",
        "Client types: B2C, Tour Operator, Travel Agent",
        "Status lifecycle: Draft → Quoted → Confirmed → In Progress → Completed / Cancelled",
        "Date range, pax breakdown (adults / children / infants)",
        "Linked quotations, packages, and flight tickets",
        "P&L summary — budgeted vs actual per cost category",
        "Credit status shown when linked to a Tour Operator",
        "File notes and internal remarks",
      ],
      steps: [
        { step: 1, title: "Open Tour Files", description: "Go to Tour Operations → Files → Open Files to see all active tour files." },
        { step: 2, title: "Create a File", description: "Click New File. Select the client type (B2C, Tour Operator, or Travel Agent). If Tour Operator, select the operator — available credit is shown before you save." },
        { step: 3, title: "Build the Package", description: "After creating the file, open the Calculator tab to build and cost the tour program." },
        { step: 4, title: "Monitor P&L", description: "Use the P&L tab to compare budgeted costs from the quotation against actual incurred costs." },
      ],
    },
    {
      id: "quotation-calculator",
      title: "Quotation Calculator",
      description:
        "An interactive cost calculator that builds the tour package and generates a Draft Quotation from a single screen. The calculator auto-saves state so you can return and edit at any time.",
      features: [
        "Global Inputs: Total Pax, ROE (EGP/USD), Mgmt Fees %, Margin %, VAT %, FOC places",
        "Section A — Transportation: predefined routes from master data or manual entry",
        "Section B — Sightseeing: entrance fees, guide types, police tips, parking",
        "Section C — Accommodation: hotel picker from live contracts, PRPN rates, VAT",
        "Section D — Nile Cruises: cabin rates from cruise contracts",
        "Section E — Meals: predefined meal rates or manual entry",
        "Section F — Guidance: guide fees per destination from master data",
        "Summary: Net PP → + Mgmt Fees → Subtotal PP → + Margin → incl. VAT → Final PP",
        "Post Calculation — locks calculator, creates package, generates Draft Quotation",
        "Reopen for Editing — unlocks calculator for revision",
      ],
      steps: [
        { step: 1, title: "Open Calculator", description: "Open a Tour File and click the Calculator tab." },
        { step: 2, title: "Set Global Inputs", description: "Enter Total Pax, ROE, and optionally Mgmt Fees %, Margin %, VAT %, and FOC places. Mgmt Fees appear in the summary before Margin." },
        { step: 3, title: "Fill Cost Sections", description: "Add transport, sightseeing, accommodation, cruise, meal, and guidance rows. Each row can use predefined master data or manual entry." },
        { step: 4, title: "Review Summary", description: "Check the Summary card: Net PP, Management Fees, Subtotal, Selling PP, incl. VAT, and Final PP." },
        { step: 5, title: "Post Calculation", description: "Click Post Calculation to lock the calculator and create a Draft Quotation. If the tour operator's credit limit is exceeded, an override request is sent to the Operations Manager automatically." },
      ],
    },
    {
      id: "management-fees",
      title: "Management Fees",
      description:
        "Management fees are charged on top of service costs and appear as a separate line in the quotation summary, component breakdown, and PDF export.",
      features: [
        "Global Mgmt Fees % in the calculator — applied to all service lines proportionally",
        "Per-component mgmt fee stored on each package component (type: percentage or fixed)",
        "Management Fees summary card on the Quotation detail page",
        "Mgmt Fee column in the component breakdown table",
        "Management Fees line in the PDF quotation export (shown only when non-zero)",
        "Calculation order: Net Cost → + Mgmt Fees → Subtotal → + Margin % → + VAT % → Final",
        "totalMgmtFees tracked separately on the quotation for reporting",
      ],
      steps: [
        { step: 1, title: "Set Mgmt Fees %", description: "In the calculator Global Inputs, enter a value in the 'Mgmt Fees %' field (positioned before Margin %)." },
        { step: 2, title: "Review per line", description: "After posting, open the Quotation detail page. The Mgmt Fee column shows the fee amount for each service component (highlighted in amber)." },
        { step: 3, title: "Check totals", description: "The summary cards show: Total Cost, Mgmt Fees, Total Selling (incl. fees), Margin, and Margin %." },
      ],
    },
    {
      id: "credit-limit-enforcement",
      title: "Credit Limit Enforcement",
      description:
        "The system automatically checks the tour operator's available credit before creating a quotation. If the new amount would exceed the credit limit, a soft block is triggered with an Operations Manager override flow.",
      features: [
        "Credit check fires at Post Calculation when a file is linked to a Tour Operator",
        "Block condition: creditUsed + new quotation total > creditLimit",
        "Credit Days (paymentTermDays) and Credit Amount set in Finance → Customers",
        "creditUsed auto-recalculates from finalised quotations of active files",
        "Soft block — does not hard-reject; sends override request to Operations Manager",
        "Blocked dialog shows: Limit / Used / Available / This Request / Exceeds by",
        "Non-OM users see: breakdown + 'request sent to your Operations Manager'",
        "Operations Manager sees: same breakdown + Approve & Create / Deny buttons with optional notes",
        "On approval: the quotation is created automatically; requester receives an in-app notification",
        "On denial: requester receives an in-app notification with the OM's notes",
        "creditUsed recalculates automatically when files are completed or cancelled",
      ],
      steps: [
        { step: 1, title: "Set Credit Terms", description: "Go to Finance → Customers → open a Tour Operator's customer record → Accounting tab. Set Credit Days, Credit Amount, and Currency." },
        { step: 2, title: "Trigger check", description: "When a staff member clicks Post Calculation on a tour file linked to that operator, the system compares the new quotation total against available credit." },
        { step: 3, title: "Staff flow (blocked)", description: "If credit is exceeded, the blocked dialog opens. The request is automatically sent to all Operations Managers. Staff click Close and wait for notification." },
        { step: 4, title: "OM flow", description: "The Operations Manager receives an in-app notification. They can review and action the request from Tour Operations → Commercial → Credit Overrides." },
        { step: 5, title: "Approval", description: "OM clicks Approve & Create. The quotation and package are created immediately and the requester is notified with a link to the file." },
      ],
    },
    {
      id: "credit-overrides",
      title: "Credit Overrides (Operations Manager)",
      description:
        "The Credit Overrides page is the Operations Manager's workspace for reviewing, approving, and denying pending credit limit override requests.",
      features: [
        "Pending tab — all awaiting requests with operator name, credit details, and overage amount",
        "Approve & Create — creates the quotation and notifies the requester",
        "Deny — cancels the request and notifies the requester with optional notes",
        "Approved tab — history of approved overrides with linked file codes",
        "Denied tab — history of denied requests",
        "Accessible via Tour Operations → Commercial → Credit Overrides",
        "In-app notification badge appears on the bell when a new request arrives",
      ],
    },
    {
      id: "package-templates",
      title: "Package Templates",
      description:
        "Reusable program templates that define the standard services, routing, and cost structure for recurring tour products.",
      features: [
        "Template header with name, duration, and destination",
        "Day-by-day itinerary with service line items",
        "Accommodation, transport, meals, and excursion components",
        "Cost per component from master data rate tables",
        "Template versioning for year-over-year updates",
        "Apply template to a quotation in one click",
      ],
    },
    {
      id: "quotations",
      title: "Quotations",
      description:
        "Detailed cost-based quotations generated from the calculator or built manually, with management fees, margin, VAT, and per-person pricing.",
      features: [
        "Quotation code auto-generated (QT-XXXXX sequence)",
        "Status: Draft → Sent → Accepted / Rejected / Expired",
        "Summary cards: Total Cost, Mgmt Fees, Total Selling, Margin, Margin %",
        "Component breakdown with Markup and Mgmt Fee columns per service",
        "Package markup override (percentage or fixed) at quotation level",
        "PDF export includes management fees column and summary line",
        "Finalize accepted quotation to confirm the file and seed P&L",
        "Credit limit check runs automatically on quotation posting",
      ],
      steps: [
        { step: 1, title: "Post via Calculator", description: "The recommended flow is to use the Calculator tab on the Tour File, which creates the package and quotation in one step." },
        { step: 2, title: "Review Quotation", description: "Open the quotation to review the five summary cards and the component breakdown with per-line management fees." },
        { step: 3, title: "Mark as Sent", description: "Click Mark Sent once you have shared the quotation with the client." },
        { step: 4, title: "Accept & Finalize", description: "When the client accepts, click Accept then Finalize & Confirm File. This locks the quotation and confirms the file status." },
        { step: 5, title: "Export PDF", description: "Click Export PDF at any stage to generate a client-ready quotation document." },
      ],
    },
    {
      id: "master-data",
      title: "Master Data",
      description:
        "Rate tables for transportation, sightseeing, guidance, and meal services used in quotation cost calculations.",
      features: [
        "Transportation rates — vehicle type, zone, seasonal pricing",
        "Sightseeing rates — attraction entry fees and guide rates",
        "Guidance rates — guide fees per language and duration",
        "Meal rates — per-head cost for different meal types and venues",
        "Seasonal overrides — date-specific rate adjustments",
        "Currency and unit configuration",
      ],
    },
    {
      id: "reports",
      title: "P&L Reports & Analytics",
      description:
        "Financial performance reports across all tour files and quotation conversions.",
      features: [
        "P&L Reports — file-by-file budget vs actual comparison",
        "Revenue Analytics — total revenue, cost, and margin over a period",
        "Conversion rate — quotations accepted vs sent",
        "Cost breakdown by service category",
        "Export to Excel for management reporting",
      ],
    },
  ],
};
