import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    age: { type: Number, required: true, min: 18, max: 100 },
    city: { type: String, required: true, trim: true },
    dependents: { type: Number, required: true, min: 0 },
    income: { type: Number, required: true, min: 0 },
    /** Incremented on logout to invalidate outstanding refresh JWTs. */
    refreshSeq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
