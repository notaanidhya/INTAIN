import { z } from 'zod';

export const loanRowSchema = z.object({
  loan_id: z.string().min(1, 'Loan ID is required'),
  borrower_name: z.string().optional().default('Unknown'),
  loan_amount: z.coerce.number().positive('Loan amount must be positive'),
  interest_rate: z.coerce.number().min(0, 'Interest rate cannot be negative').max(100, 'Interest rate must be <= 100'),
  start_date: z.string().min(1, 'Start date is required'),
  maturity_date: z.string().min(1, 'Maturity date is required'),
  status: z.string().min(1, 'Status is required')
}).superRefine((data, ctx) => {
  const start = new Date(data.start_date);
  const end = new Date(data.maturity_date);
  
  if (isNaN(start.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid start date format", path: ["start_date"] });
  }
  if (isNaN(end.getTime())) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid maturity date format", path: ["maturity_date"] });
  }
  if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start > end) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Start date must be before maturity date", path: ["start_date"] });
  }
});
