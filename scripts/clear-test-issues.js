/**
 * Delete all QA test issues from MongoDB (fresh start).
 * Run: node --env-file=.env scripts/clear-test-issues.js
 */

import mongoose from "mongoose";
import { clearAllTestIssues } from "../server/test-issues-store.js";

const { deletedCount } = await clearAllTestIssues();
console.log(`Deleted ${deletedCount} test issue(s). QA tracker is now empty.`);
await mongoose.disconnect();