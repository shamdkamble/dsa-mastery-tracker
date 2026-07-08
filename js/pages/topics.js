import { createPage } from "../components/page-shell.js";

export default {
  title: "Topics",
  render() {
    return createPage({
      title: "Topics",
      description: "Master data structures and algorithms organized by topic and difficulty.",
      iconName: "topics",
    });
  },
};