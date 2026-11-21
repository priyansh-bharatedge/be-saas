import { z } from "zod";

export const salesTargetSchema = z.object({
  bdmId: z.string().min(1, "BDM is required"),
  month: z.coerce.number().min(1, "Month must be between 1 and 12").max(12),
  year: z.coerce.number().min(2020).max(2035),
  targetAmount: z.coerce.number().min(0, "Target amount must be positive"),
  targetDealsCount: z.coerce.number().min(0).optional().default(0),
  remarks: z.string().optional().or(z.literal("")),
});

export type SalesTargetFormData = z.infer<typeof salesTargetSchema>;

export interface SalesKpiMetrics {
  totalQuotations: number;
  totalPaymentRecords: number;
  totalRevenue: number;
  verifiedRevenue: number;
  unverifiedRevenue: number;
  crmPendingCount: number;

  bookedDealAmount: number;
  totalGst: number;
  totalWithoutGst: number;
  receivedGst: number;
  receivedWithoutGst: number;
  totalOutsourceCost: number;

  targetAmount: number;
  targetDealsCount?: number;
  achievedAmount: number;
  achievedDealsCount: number;
  shortfallAmount: number;
  achievementRate: number;
}

export interface BdmPerformanceSummary {
  bdmId: string;
  bdmName: string;
  bdmEmail: string;
  tlId: string | null;
  tlName: string | null;
  metrics: SalesKpiMetrics;
}

export interface TlTeamPerformance {
  tlId: string;
  tlName: string;
  teamMembers: BdmPerformanceSummary[];
  teamTotals: SalesKpiMetrics;
}

export interface AccountsDashboardMetrics {
  totalRevenue: number;
  receivedAmount: number;
  pendingAmount: number;
  totalGst: number;
  withoutGst: number;
  receivedGst: number;
  receivedWithoutGst: number;
  totalOutsourceCost: number;

  bsplReceived: number;
  bsplPending: number;
  bsplDealsCount: number;

  bsaplReceived: number;
  bsaplPending: number;
  bsaplDealsCount: number;

  unverifiedPaymentsCount: number;
  unverifiedPaymentsAmount: number;
  verifiedPaymentsCount: number;
  verifiedPaymentsAmount: number;
  rejectedPaymentsCount: number;
  rejectedPaymentsAmount: number;

  recentPayments: Array<{
    id: string;
    receiptNumber: string;
    amount: number;
    bankType: string;
    paymentType: string;
    status: string;
    clientName: string;
    date: string;
  }>;
}

export interface LegalDashboardMetrics {
  dealsPendingReviewCount: number;
  legalDocsSentCount: number;
  legalDocsReceivedCount: number;
  dealsForwardedToOperationsCount: number;
  recentLegalDeals: Array<{
    id: string;
    dealNumber: string;
    title: string;
    clientName: string;
    companyName: string;
    totalValue: number;
    internalLegalStatus: string;
    accountsStatus: string;
    bookingDate: string;
  }>;
}

export interface OperationsDashboardMetrics {
  workloadByTeam: Record<
    string,
    { total: number; active: number; quality: number; completed: number }
  >;
  activeFilesCount: number;
  completedFilesCount: number;
  unassignedQueueCount: number;
  recentOperations: Array<{
    id: string;
    operationNumber: string;
    dealNumber: string;
    serviceName: string;
    teamType: string;
    stage: string;
    internalStage: string;
    status: string;
    assignedTlName: string | null;
    assignedTmName: string | null;
  }>;
}

export interface QualityDashboardMetrics {
  allFilesCount: number;
  pendingAuditCount: number;
  completedAuditCount: number;
  dealsInQualityCount: number;
  averageScore: number;
  highQualityCount: number;
  returnedForRevisionCount: number;
  recentQualityDeals: Array<{
    id: string;
    dealNumber: string;
    companyName: string;
    totalValue: number;
    isQualityPassed: boolean;
    qualityRemarks: string | null;
    updatedAt: string;
  }>;
}

export interface DashboardData {
  userDepartment: string;
  userSystemRole: string;
  userName: string;
  isSuperAdmin: boolean;
  isSalesHod: boolean;
  isSalesTl: boolean;
  isSalesTm: boolean;
  selectedMonth: number;
  selectedYear: number;
  salesData: {
    personalMetrics?: SalesKpiMetrics;
    teamPerformance?: TlTeamPerformance;
    orgPerformance?: {
      summary: SalesKpiMetrics;
      teams: TlTeamPerformance[];
      allBdms: BdmPerformanceSummary[];
    };
    activeBdmsList: Array<{ id: string; name: string; department: string }>;
  };
  accountsData: AccountsDashboardMetrics;
  legalData: LegalDashboardMetrics;
  operationsData: OperationsDashboardMetrics;
  qualityData: QualityDashboardMetrics;
}
