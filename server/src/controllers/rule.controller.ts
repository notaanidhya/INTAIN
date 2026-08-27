import { Request, Response } from 'express';
import { prisma } from '../models/prismaClient';
import { AIService } from '../services/ai.service';
import { DEFAULT_VALIDATION_RULES } from '../config/defaultRules';

export const listRules = async (req: Request, res: Response) => {
  try {
    let rules = await prisma.validationRule.findMany({
      orderBy: { createdAt: 'asc' }
    });

    if (rules.length === 0) {
      for (const r of DEFAULT_VALIDATION_RULES) {
        await prisma.validationRule.create({
          data: {
            ruleCode: r.ruleCode,
            name: r.name,
            description: r.description,
            field: r.field,
            ruleType: r.ruleType,
            severity: r.severity,
            errorMessage: r.errorMessage,
            parameters: r.parameters ? JSON.stringify(r.parameters) : '{}',
            isActive: r.isActive
          }
        });
      }
      rules = await prisma.validationRule.findMany({ orderBy: { createdAt: 'asc' } });
    }

    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch rules', details: error.message });
  }
};

export const toggleRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rule = await prisma.validationRule.findUnique({ where: { id: String(id) } });
    if (!rule) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    const updated = await prisma.validationRule.update({
      where: { id: String(id) },
      data: { isActive: !rule.isActive }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to toggle rule', details: error.message });
  }
};

export const generateRuleFromNl = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const generated = await AIService.generateRuleFromNaturalLanguage(prompt);

    const createdRule = await prisma.validationRule.create({
      data: {
        ruleCode: generated.ruleCode || `NL_RULE_${Date.now()}`,
        name: generated.name || 'AI Generated Rule',
        description: generated.description || prompt,
        field: generated.field || 'current_balance',
        ruleType: generated.ruleType || 'RANGE',
        severity: generated.severity || 'ERROR',
        errorMessage: generated.errorMessage || prompt,
        parameters: typeof generated.parameters === 'object' ? JSON.stringify(generated.parameters) : (generated.parameters || '{}'),
        isActive: true,
        isCustom: true,
        generatedPrompt: prompt
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'RULE_CREATED',
        field: createdRule.field,
        newValue: createdRule.name,
        performedBy: 'Human Reviewer (via AI NL Rule Generator)',
        metadata: JSON.stringify({ prompt, ruleCode: createdRule.ruleCode })
      }
    });

    res.status(201).json(createdRule);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate rule', details: error.message });
  }
};
