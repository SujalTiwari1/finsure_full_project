import mongoose from "mongoose";
import { Analysis } from "../models/Analysis.model.js";

const LIST_LIMIT = 50;

/**
 * GET /api/analysis — history for the authenticated user (Phase 6 PRD).
 */
export async function listMyAnalyses(req, res, next) {
  try {
    const rows = await Analysis.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(LIST_LIMIT)
      .lean();

    const analyses = rows.map((r) => {
      const cf = r.result?.cash_flow;
      return {
        id: r._id.toString(),
        createdAt: r.createdAt,
        originalFilename: r.originalFilename,
        income: r.income,
        profile: {
          age: r.age,
          city: r.city,
          dependents: r.dependents,
        },
        total_transactions: r.result?.total_transactions,
        risk: r.result?.risk,
        cashFlow: cf
          ? {
              total_income: cf.total_income,
              total_expenses: cf.total_expenses,
              savings_rate_pct: cf.savings_rate_pct,
            }
          : undefined,
      };
    });

    return res.json({ analyses });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/analysis/:analysisId — full stored result for the owner.
 */
export async function getAnalysisById(req, res, next) {
  try {
    const { analysisId } = req.params;
    if (!mongoose.isValidObjectId(analysisId)) {
      return res.status(400).json({ error: "Invalid analysis id." });
    }

    const doc = await Analysis.findOne({
      _id: analysisId,
      user: req.user.id,
    }).lean();

    if (!doc) {
      return res.status(404).json({ error: "Analysis not found." });
    }

    return res.json({
      id: doc._id.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      originalFilename: doc.originalFilename,
      income: doc.income,
      age: doc.age,
      city: doc.city,
      dependents: doc.dependents,
      existingTerm: doc.existingTerm,
      existingHealth: doc.existingHealth,
      result: doc.result,
    });
  } catch (err) {
    next(err);
  }
}
