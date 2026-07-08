import { createPage } from "../components/page-shell.js";

export default {
  title: "Favorites",
  render() {
    return createPage({
      title: "Favorites",
      description: "Quick access to bookmarked problems and go-to reference material.",
      iconName: "favorites",
    });
  },
};