// Tipos usados só no client, para respostas de API com dados de colaborador
// embutidos (joins do Supabase). Não confundir com lib/types.ts, que
// modela as linhas puras das tabelas.
import type {
  TimeEntry,
  VacationPeriod,
  VacationBooking,
  PayrollRecord,
  PayrollBenefit,
  PayrollDeduction,
  PerformanceReview,
  PerformanceReviewTemplate,
  PerformanceReviewTemplateCriterion,
  PerformanceReviewCriteriaScore,
  Attestation,
  PpeDelivery,
  TrainingProgram,
  TrainingSession,
  TrainingSessionAttendee,
  ComplianceDocument,
  OnboardingTask,
  Termination,
  ExitInterviewAnswer,
} from "@/lib/types";

export interface EmployeeRefLite {
  id: string;
  name: string;
  branch_id?: string;
  status?: "active" | "inactive";
}

export interface WithEmployee {
  employee?: { id: string; name: string; branch_id: string } | null;
}

export type TimeEntryWithEmployee = TimeEntry & WithEmployee;
export type VacationPeriodWithEmployee = VacationPeriod & WithEmployee;
export type VacationBookingWithEmployee = VacationBooking & WithEmployee;
export type PerformanceReviewWithEmployee = PerformanceReview &
  WithEmployee & { criteria_scores?: PerformanceReviewCriteriaScore[] };
export type AttestationWithEmployee = Attestation & WithEmployee;
export type PpeDeliveryWithEmployee = PpeDelivery & WithEmployee;
export type ComplianceDocumentWithEmployee = ComplianceDocument & WithEmployee;
export type OnboardingTaskWithEmployee = OnboardingTask & WithEmployee;
export type TerminationWithEmployee = Termination & WithEmployee;

export interface PayrollRecordFull extends PayrollRecord {
  employee?: { id: string; name: string; branch_id: string } | null;
  benefits: PayrollBenefit[];
  deductions: PayrollDeduction[];
}

export interface TerminationFull extends TerminationWithEmployee {
  exit_interview_answers: ExitInterviewAnswer[];
}

export interface TrainingProgramWithPositions extends TrainingProgram {
  position_ids: string[];
  position_titles: string[];
}

export interface AttendeeEmployeeRef {
  id: string;
  name: string;
  branch_id: string;
  branch?: { name: string } | null;
  position?: { title: string } | null;
}

export interface TrainingSessionAttendeeWithEmployee extends TrainingSessionAttendee {
  employee?: AttendeeEmployeeRef | null;
}

export interface TrainingSessionWithDetails extends TrainingSession {
  training_program?: { id: string; name: string; periodicity: TrainingProgram["periodicity"] } | null;
  attendees: TrainingSessionAttendeeWithEmployee[];
}

export interface PerformanceReviewTemplateWithCriteria extends PerformanceReviewTemplate {
  criteria: PerformanceReviewTemplateCriterion[];
}
