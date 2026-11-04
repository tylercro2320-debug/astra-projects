import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { currentUser } from "@/server/accounts";
import { DreamCorpStudio } from "@/studio/studio-app";
import { uiFont } from "@/dreamcorp/fonts";

import "@/studio/studio.css";

export const metadata: Metadata = {
  title: "Studio",
  alternates: { canonical: "/studio" },
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  if (!(await currentUser())) redirect("/login?next=/studio");
  return <DreamCorpStudio fontClassName={uiFont.variable} />;
}
