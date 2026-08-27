import { Request, Response } from 'express';
import { prisma } from '../models/prismaClient';
import { AIService } from '../services/ai.service';

export const listExceptions = async (req: Request, res: Response) => {
  try {
    const { severity, field, status = 'OPEN' } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = String(status);
    }
    if (severity && severity !== 'ALL') {
      where.severity = String(severity);
    }
    if (field && field !== 'ALL') {
      where.field = String(field);
    }

    const exceptions = await prisma.exception.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      include: {
        loan: true
      }
    });

    res.json(exceptions);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch exceptions', details: error.message });
  }
};

export const getException = async (req: Request, res: Response): Promise<void> => {
  try {
    const exception = await prisma.exception.findUnique({
      where: { id: String(req.params.id) },
      include: { loan: true }
    });

    if (!exception) {
      res.status(404).json({ error: 'Exception not found' });
      return;
    }

    res.json(exception);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch exception', details: error.message });
  }
};

export const generateAiSuggestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const exception = await prisma.exception.findUnique({
      where: { id: String(req.params.id) },
      include: { loan: true }
    });

    if (!exception) {
      res.status(404).json({ error: 'Exception not found' });
      return;
    }

    const suggestion = await AIService.explainException(exception, exception.loan);

    const updated = await prisma.exception.update({
      where: { id: exception.id },
      data: {
        aiExplanation: suggestion.explanation,
        suggestedValue: suggestion.suggested_value,
        aiConfidence: suggestion.confidence,
        aiModel: suggestion.model_name,
        aiPromptVersion: suggestion.prompt_version
      },
      include: { loan: true }
    });

    await prisma.auditLog.create({
      data: {
        loanId: exception.loanId,
        action: 'AI_SUGGESTION',
        field: exception.field,
        oldValue: exception.originalValue,
        newValue: suggestion.suggested_value,
        performedBy: 'Intain AI Copilot',
        metadata: JSON.stringify({
          model: suggestion.model_name,
          confidence: suggestion.confidence,
          latencyMs: suggestion.latency_ms,
          reasoningSteps: suggestion.reasoning_steps
        })
      }
    });

    res.json({
      exception: updated,
      reasoning_steps: suggestion.reasoning_steps,
      model_name: suggestion.model_name,
      prompt_version: suggestion.prompt_version,
      timestamp: suggestion.timestamp,
      latency_ms: suggestion.latency_ms
    });
  } catch (error: any) {
    console.error('AI Suggestion Error:', error);
    res.status(500).json({ error: 'AI generation failed', details: error.message });
  }
};

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export const resolveException = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, newValue, reviewer, reviewerComment } = req.body;

    const exception = await prisma.exception.findUnique({
      where: { id: String(req.params.id) },
      include: { loan: true }
    });

    if (!exception) {
      res.status(404).json({ error: 'Exception not found' });
      return;
    }

    let finalValue = exception.originalValue;
    let newStatus = 'RESOLVED_MANUAL';

    if (action === 'ACCEPT_AI') {
      finalValue = exception.suggestedValue || exception.originalValue;
      newStatus = 'RESOLVED_ACCEPTED';
    } else if (action === 'REJECT_AI') {
      finalValue = exception.originalValue;
      newStatus = 'RESOLVED_REJECTED';
    } else if (action === 'MANUAL_EDIT') {
      finalValue = newValue;
      newStatus = 'RESOLVED_MANUAL';
    }

    await prisma.exception.update({
      where: { id: exception.id },
      data: {
        status: newStatus,
        resolvedAt: new Date(),
        resolvedBy: reviewer || 'Human Reviewer',
        reviewerComment: reviewerComment || null
      }
    });

    // If accepted or manually edited, apply value update to the loan model
    if (action === 'ACCEPT_AI' || action === 'MANUAL_EDIT') {
      const modelField = toCamelCase(exception.field);
      const loanUpdateData: any = {};

      if (['originalPrincipal', 'currentBalance', 'interestRate'].includes(modelField)) {
        loanUpdateData[modelField] = Number(finalValue);
      } else if (['termMonths', 'daysPastDue'].includes(modelField)) {
        loanUpdateData[modelField] = parseInt(String(finalValue), 10);
      } else if (['originationDate', 'maturityDate', 'lastPaymentDate', 'lastUpdatedAt'].includes(modelField)) {
        loanUpdateData[modelField] = new Date(finalValue);
      } else {
        loanUpdateData[modelField] = String(finalValue);
      }

      await prisma.loan.update({
        where: { id: exception.loanId },
        data: loanUpdateData
      });

      await prisma.auditLog.create({
        data: {
          loanId: exception.loanId,
          action: 'FIELD_EDIT',
          field: modelField,
          oldValue: exception.originalValue,
          newValue: reviewerComment ? `${finalValue} [Note: ${reviewerComment}]` : String(finalValue),
          performedBy: reviewer || 'Human Reviewer',
          metadata: JSON.stringify({ resolutionAction: action, exceptionId: exception.id })
        }
      });
    }

    // Check if any open exceptions remain on this loan
    const remainingOpen = await prisma.exception.count({
      where: {
        loanId: exception.loanId,
        status: 'OPEN'
      }
    });

    if (remainingOpen === 0) {
      await prisma.loan.update({
        where: { id: exception.loanId },
        data: { verificationStatus: 'PENDING' }
      });
    }

    res.json({ success: true, remainingOpenExceptions: remainingOpen });
  } catch (error: any) {
    console.error('Resolve exception error:', error);
    res.status(500).json({ error: 'Resolution failed', details: error.message });
  }
};

export const bulkResolveExceptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { exceptionIds, action, reviewer } = req.body;
    if (!Array.isArray(exceptionIds) || exceptionIds.length === 0) {
      res.status(400).json({ error: 'exceptionIds array is required' });
      return;
    }

    let resolvedCount = 0;
    for (const id of exceptionIds) {
      const ex = await prisma.exception.findUnique({ where: { id: String(id) } });
      if (!ex || ex.status !== 'OPEN') continue;

      const suggestedVal = ex.suggestedValue || ex.originalValue;
      await prisma.exception.update({
        where: { id: ex.id },
        data: {
          status: action === 'ACCEPT_ALL_AI' ? 'RESOLVED_ACCEPTED' : 'RESOLVED_REJECTED',
          resolvedAt: new Date(),
          resolvedBy: reviewer || 'QC Reviewer (Bulk Action)',
          reviewerComment: 'Bulk action execution'
        }
      });

      if (action === 'ACCEPT_ALL_AI' && ex.suggestedValue) {
        const modelField = toCamelCase(ex.field);
        const updateData: any = {};
        if (['originalPrincipal', 'currentBalance', 'interestRate'].includes(modelField)) {
          updateData[modelField] = Number(suggestedVal);
        } else if (['termMonths', 'daysPastDue'].includes(modelField)) {
          updateData[modelField] = parseInt(String(suggestedVal), 10);
        } else if (['originationDate', 'maturityDate', 'lastPaymentDate', 'lastUpdatedAt'].includes(modelField)) {
          updateData[modelField] = new Date(suggestedVal);
        } else {
          updateData[modelField] = String(suggestedVal);
        }

        await prisma.loan.update({
          where: { id: ex.loanId },
          data: updateData
        });

        await prisma.auditLog.create({
          data: {
            loanId: ex.loanId,
            action: 'FIELD_EDIT',
            field: modelField,
            oldValue: ex.originalValue,
            newValue: suggestedVal,
            performedBy: reviewer || 'QC Reviewer (Bulk Action)',
            metadata: JSON.stringify({ resolutionAction: 'BULK_ACCEPT_AI', exceptionId: ex.id })
          }
        });
      }

      // Check remaining open on loan
      const remainingOpen = await prisma.exception.count({
        where: { loanId: ex.loanId, status: 'OPEN' }
      });
      if (remainingOpen === 0) {
        await prisma.loan.update({
          where: { id: ex.loanId },
          data: { verificationStatus: 'PENDING' }
        });
      }
      resolvedCount++;
    }

    res.json({ success: true, resolvedCount });
  } catch (error: any) {
    res.status(500).json({ error: 'Bulk resolution failed', details: error.message });
  }
};

export const getBatchSummary = async (req: Request, res: Response) => {
  try {
    const openExceptions = await prisma.exception.findMany({
      where: { status: 'OPEN' },
      include: { loan: true }
    });

    const summary = await AIService.summarizeExceptionsBatch(openExceptions);
    res.json({ summary, totalOpenExceptions: openExceptions.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Batch summary failed', details: error.message });
  }
};
