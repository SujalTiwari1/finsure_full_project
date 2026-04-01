import mongoose from "mongoose";

/**
 * PRD §9 — Analysis: cashflow + risk + recommendations (from ML pipeline).
 */
const analysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalFilename: { type: String, default: "" },
    income: { type: Number },
    age: { type: Number },
    city: { type: String },
    dependents: { type: Number },
    existingTerm: { type: Number, default: 0 },
    existingHealth: { type: Number, default: 0 },
    /** Parsed ML payload: transactions, cash_flow, risk, recommendations, etc. */
    result: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

analysisSchema.index({ user: 1, createdAt: -1 });

export const Analysis = mongoose.model("Analysis", analysisSchema);
