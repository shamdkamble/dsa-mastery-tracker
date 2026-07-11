/**
 * QA test issue — MongoDB `test_issues` collection
 */

import mongoose from "mongoose";
import { TEST_ISSUE_SEVERITIES, TEST_ISSUE_STATUSES } from "../user-constants.js";

const testIssueSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    issueNumber: { type: Number, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    pageArea: { type: String, default: "" },
    severity: { type: String, enum: TEST_ISSUE_SEVERITIES, default: "medium" },
    status: { type: String, enum: TEST_ISSUE_STATUSES, default: "pending", index: true },
    stepsToReproduce: { type: String, default: "" },
    expectedBehavior: { type: String, default: "" },
    actualBehavior: { type: String, default: "" },
    reporterId: { type: String, required: true, index: true },
    reporterName: { type: String, default: "" },
    reporterEmail: { type: String, default: "" },
    adminNotes: { type: String, default: "" },
    fixedById: { type: String, default: null },
    fixedByName: { type: String, default: null },
    fixedAt: { type: String, default: null },
    resolvedAt: { type: String, default: null },
    confirmedById: { type: String, default: null },
    confirmedByName: { type: String, default: null },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    collection: "test_issues",
    versionKey: false,
  },
);

testIssueSchema.index({ id: 1 }, { unique: true });

export const TestIssue = mongoose.models.TestIssue || mongoose.model("TestIssue", testIssueSchema);

export function toTestIssueDto(doc) {
  if (!doc) return null;
  const d = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = d;
  return rest;
}