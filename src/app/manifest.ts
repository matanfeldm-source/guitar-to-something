import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guitar → Strings Arranger",
    short_name: "Arranger",
    description:
      "Turn guitar tab into violin, cello, mandolin, and more — with chords, library, and practice views.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4eadf",
    theme_color: "#5c3d2e",
    orientation: "portrait-primary",
    categories: ["music", "entertainment"],
  };
}
