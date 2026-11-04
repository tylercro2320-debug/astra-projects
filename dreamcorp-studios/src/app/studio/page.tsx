import type { Metadata } from "next";

import { DreamCorpStudio } from "@/studio/studio-app";
import { uiFont } from "@/dreamcorp/fonts";

import "@/studio/studio.css";

export const metadata: Metadata = {
  title: "Studio",
  alternates: { canonical: "/studio" },
};

export default function StudioPage() {
  return <DreamCorpStudio fontClassName={uiFont.variable} />;
}
