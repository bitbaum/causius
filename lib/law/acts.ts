/**
 * Swiss federal acts people and letters name by abbreviation, mapped to their
 * number in the Classified Compilation (SR / RS). One act has an abbreviation
 * in each official language, so all of them point at the same number.
 *
 * Only the acts a letter to a person is likely to rest on. Anything else is
 * still readable by its SR number, which every Fedlex page shows.
 */
export const FEDERAL_ACTS: Record<string, string> = {
  // Constitution
  BV: "101", CST: "101", COST: "101",
  // Civil law
  ZGB: "210", CC: "210",
  OR: "220", CO: "220",
  VMWG: "221.213.11", OBLF: "221.213.11", OLAL: "221.213.11",
  DSG: "235.1", LPD: "235.1",
  // Procedure, debt collection
  ZPO: "272", CPC: "272",
  SCHKG: "281.1", LP: "281.1", LEF: "281.1",
  // Criminal law
  STGB: "311.0", CP: "311.0",
  STPO: "312.0", CPP: "312.0",
  SVG: "741.01", LCR: "741.01", LCSTR: "741.01",
  // Administration and courts
  VWVG: "172.021", PA: "172.021",
  BGG: "173.110", LTF: "173.110",
  // Migration
  AIG: "142.20", LEI: "142.20", LSTRI: "142.20",
  ASYLG: "142.31", LASI: "142.31",
  BÜG: "141.0", BUEG: "141.0", LN: "141.0", LCIT: "141.0",
  // Tax
  DBG: "642.11", LIFD: "642.11",
  STHG: "642.14", LHID: "642.14", LAID: "642.14",
  MWSTG: "641.20", LTVA: "641.20", LIVA: "641.20",
  // Social insurance
  ATSG: "830.1", LPGA: "830.1",
  AHVG: "831.10", LAVS: "831.10",
  IVG: "831.20", LAI: "831.20",
  BVG: "831.40", LPP: "831.40",
  KVG: "832.10", LAMAL: "832.10",
  UVG: "832.20", LAA: "832.20",
  AVIG: "837.0", LACI: "837.0", LADI: "837.0",
  ELG: "831.30", LPC: "831.30",
  // Work
  ARG: "822.11", LTR: "822.11", LL: "822.11",
  GLG: "151.1", LEG: "151.1", LPAR: "151.1",
};

const SR_NUMBER = /^\d{1,3}(\.\d{1,3})*$/;

/** "OR", "co", "SR 220", "RS 220", "220" → "220"; an unknown name → null. */
export function srNumber(act: string): string | null {
  const plain = act.trim().replace(/^(SR|RS)\s*/i, "");
  if (SR_NUMBER.test(plain)) return plain;
  const key = plain.toUpperCase().replace(/[.\s]/g, "");
  return FEDERAL_ACTS[key] ?? null;
}
