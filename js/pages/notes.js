import { createPage } from "../components/page-shell.js";

export default {
  title: "Notes",
  render() {
    return createPage({
      title: "Notes",
      description: "Capture insights, patterns, and solutions for every problem you solve.",
      iconName: "notes",
    });
  },
};