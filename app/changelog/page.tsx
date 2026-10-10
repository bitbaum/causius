import type { Metadata } from "next";
import { DevelopmentRecords } from "@/components/DevelopmentRecords";

export const metadata: Metadata = { title: "Changelog" };

export default function ChangelogPage() {
  return <DevelopmentRecords section="changelog" />;
}
