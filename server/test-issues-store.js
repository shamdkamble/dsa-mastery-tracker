/**
 * QA test issues — persistence & workflow
 */

import { randomUUID } from "node:crypto";
import { connectDB } from "./db/mongodb.js";
import { TestIssue, toTestIssueDto } from "./models/TestIssue.js";
import { TEST_ISSUE_SEVERITIES, TEST_ISSUE_STATUSES } from "./user-constants.js";
import { createUserNotification } from "./notifications-db.js";

export class TestIssueError extends Error {
  constructor(message, { status = 400, code = "ISSUE_ERROR" } = {}) {
    super(message);
    this.name = "TestIssueError";
    this.status = status;
    this.code = code;
  }
}

const ISSUE_FIELDS = [
  "title", "description", "pageArea", "severity", "status",
  "stepsToReproduce", "expectedBehavior", "actualBehavior", "adminNotes",
];

function pickFields(data) {
  const out = {};
  for (const key of ISSUE_FIELDS) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  return out;
}

function sortIssues(issues) {
  return [...issues].sort((a, b) => {
    const na = a.issueNumber || 0;
    const nb = b.issueNumber || 0;
    if (nb !== na) return nb - na;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

async function nextIssueNumber() {
  const latest = await TestIssue.findOne().sort({ issueNumber: -1 }).lean();
  return (latest?.issueNumber || 0) + 1;
}

export async function listTestIssues() {
  await connectDB();
  const docs = await TestIssue.find().lean();
  return sortIssues(docs.map(toTestIssueDto));
}

export async function getTestIssueStats() {
  const issues = await listTestIssues();
  const counts = {
    total: issues.length,
    pending: 0,
    in_progress: 0,
    fixed: 0,
    resolved: 0,
    critical: 0,
  };

  issues.forEach((issue) => {
    if (counts[issue.status] !== undefined) counts[issue.status]++;
    if (issue.severity === "critical" && issue.status !== "resolved") counts.critical++;
  });

  return counts;
}

export async function createTestIssue(reporter, data) {
  if (!data?.title?.trim()) {
    throw new TestIssueError("Issue title is required.", { status: 400, code: "INVALID_INPUT" });
  }

  const severity = data.severity || "medium";
  if (!TEST_ISSUE_SEVERITIES.includes(severity)) {
    throw new TestIssueError("Invalid severity.", { status: 400, code: "INVALID_INPUT" });
  }

  await connectDB();
  const now = new Date().toISOString();
  const issueNumber = await nextIssueNumber();

  const doc = await TestIssue.create({
    id: data.id || `issue_${randomUUID()}`,
    issueNumber,
    title: data.title.trim(),
    description: String(data.description || "").trim(),
    pageArea: String(data.pageArea || "").trim(),
    severity,
    status: "pending",
    stepsToReproduce: String(data.stepsToReproduce || "").trim(),
    expectedBehavior: String(data.expectedBehavior || "").trim(),
    actualBehavior: String(data.actualBehavior || "").trim(),
    reporterId: reporter.id,
    reporterName: reporter.name || "",
    reporterEmail: reporter.email || "",
    adminNotes: "",
    createdAt: now,
    updatedAt: now,
  });

  return toTestIssueDto(doc);
}

async function notifyReporter(issue, payload, pushTag) {
  if (!issue?.reporterId) return;
  try {
    await createUserNotification(issue.reporterId, payload, { pushTag });
  } catch (err) {
    console.warn("[test-issues] notification failed", err);
  }
}

export async function updateTestIssue(actor, issueId, updates) {
  await connectDB();
  const doc = await TestIssue.findOne({ id: issueId });
  if (!doc) {
    throw new TestIssueError("Issue not found.", { status: 404, code: "NOT_FOUND" });
  }

  const role = actor.role;
  const now = new Date().toISOString();
  const prevStatus = doc.status;

  if (role === "admin") {
    if (updates.status === "resolved") {
      throw new TestIssueError("Only testers can mark issues as resolved.", { status: 403, code: "FORBIDDEN" });
    }

    if (updates.status) {
      if (!TEST_ISSUE_STATUSES.includes(updates.status) || updates.status === "resolved") {
        throw new TestIssueError("Invalid status for admin update.", { status: 400, code: "INVALID_INPUT" });
      }
      doc.status = updates.status;
      if (updates.status === "fixed") {
        doc.fixedById = actor.id;
        doc.fixedByName = actor.name || "Admin";
        doc.fixedAt = now;
      }
    }

    if (updates.adminNotes !== undefined) {
      doc.adminNotes = String(updates.adminNotes || "").trim();
    }
  } else if (role === "tester") {
    const isOwner = doc.reporterId === actor.id;

    if (updates.action === "confirm_resolved") {
      if (doc.status !== "fixed") {
        throw new TestIssueError("Only fixed issues can be confirmed as resolved.", { status: 400, code: "INVALID_STATE" });
      }
      doc.status = "resolved";
      doc.resolvedAt = now;
      doc.confirmedById = actor.id;
      doc.confirmedByName = actor.name || "Tester";
    } else if (updates.action === "reopen") {
      if (doc.status !== "fixed") {
        throw new TestIssueError("Only fixed issues can be reopened.", { status: 400, code: "INVALID_STATE" });
      }
      doc.status = "pending";
      doc.fixedAt = null;
      doc.fixedById = null;
      doc.fixedByName = null;
    } else if (isOwner && doc.status === "pending") {
      const fields = pickFields(updates);
      if (fields.severity && !TEST_ISSUE_SEVERITIES.includes(fields.severity)) {
        throw new TestIssueError("Invalid severity.", { status: 400, code: "INVALID_INPUT" });
      }
      Object.assign(doc, fields);
    } else {
      throw new TestIssueError("You cannot update this issue.", { status: 403, code: "FORBIDDEN" });
    }
  } else {
    throw new TestIssueError("Testing panel access required.", { status: 403, code: "FORBIDDEN" });
  }

  doc.updatedAt = now;
  await doc.save();

  const issue = toTestIssueDto(doc);

  if (role === "admin" && prevStatus !== "fixed" && issue.status === "fixed") {
    await notifyReporter(issue, {
      title: "Issue marked fixed",
      text: `"${issue.title}" is ready for your verification.`,
      variant: "success",
      href: "#/testing-issues",
    }, `issue-fixed-${issue.id}`);
  }

  if (role === "admin" && prevStatus !== "in_progress" && issue.status === "in_progress") {
    await notifyReporter(issue, {
      title: "Issue in progress",
      text: `An admin is working on "${issue.title}".`,
      variant: "info",
      href: "#/testing-issues",
    }, `issue-progress-${issue.id}`);
  }

  return issue;
}