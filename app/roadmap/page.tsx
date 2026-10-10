import type { Metadata } from "next";
import { DevelopmentRecords } from "@/components/DevelopmentRecords";

export const metadata: Metadata = { title: "Roadmap" };

export default function RoadmapPage() {
  return <DevelopmentRecords section="roadmap" />;
}
