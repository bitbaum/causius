import { getTranslations } from "next-intl/server";

const ROWS = ["deadline", "cites", "private", "advice", "cost"] as const;
const COLS = ["chatbot", "causius", "lawyer"] as const;

/**
 * What a general chatbot, Causius and a lawyer each do. Honest in both
 * directions: Causius does not advise or represent, and the table says so in
 * its own column.
 */
export async function Compare() {
  const t = await getTranslations("Home.compare");
  return (
    <table className="w-full table-fixed border-collapse text-left text-xs sm:text-sm">
        <thead>
          <tr>
            <th scope="col" className="w-[34%] pb-3" />
            {COLS.map((c) => (
              <th
                key={c}
                scope="col"
                className={`px-2 pb-3 align-bottom font-semibold sm:px-3 ${c === "causius" ? "rounded-t-surface bg-accent/10 pt-3 text-accent" : ""}`}
              >
                {t(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r} className="border-t border-border-subtle">
              <th scope="row" className="py-3 pr-2 font-normal text-fg-secondary sm:pr-3">
                {t(`rows.${r}.label`)}
              </th>
              {COLS.map((c) => (
                <td key={c} className={`px-2 py-3 sm:px-3 ${c === "causius" ? "bg-accent/10 font-medium" : ""}`}>
                  {t(`rows.${r}.${c}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
    </table>
  );
}
