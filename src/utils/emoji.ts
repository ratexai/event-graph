/* ═══════════════════════════════════════════════════════════════
   Tag-based emoji helper utilities
   ═══════════════════════════════════════════════════════════════ */

// ─── Tag-based emoji helpers ───────────────────────────────────

export const TAG_FLAGS: Record<string, string> = {
  trump: "\u{1F1FA}\u{1F1F8}", "us-politics": "\u{1F1FA}\u{1F1F8}", "us-gov": "\u{1F1FA}\u{1F1F8}", "us-casualties": "\u{1F1FA}\u{1F1F8}",
  israel: "\u{1F1EE}\u{1F1F1}", iran: "\u{1F1EE}\u{1F1F7}",
  uae: "\u{1F1E6}\u{1F1EA}", dubai: "\u{1F1E6}\u{1F1EA}",
  qatar: "\u{1F1F6}\u{1F1E6}", bahrain: "\u{1F1E7}\u{1F1ED}",
  lebanon: "\u{1F1F1}\u{1F1E7}", beirut: "\u{1F1F1}\u{1F1E7}", hezbollah: "\u{1F1F1}\u{1F1E7}",
  iraq: "\u{1F1EE}\u{1F1F6}", saudi: "\u{1F1F8}\u{1F1E6}",
  pakistan: "\u{1F1F5}\u{1F1F0}", cyprus: "\u{1F1E8}\u{1F1FE}", uk: "\u{1F1EC}\u{1F1E7}",
  kuwait: "\u{1F1F0}\u{1F1FC}", russia: "\u{1F1F7}\u{1F1FA}",
  china: "\u{1F1E8}\u{1F1F3}", gcc: "\u{1F30D}",
  france: "\u{1F1EB}\u{1F1F7}", jordan: "\u{1F1EF}\u{1F1F4}",
  germany: "\u{1F1E9}\u{1F1EA}", japan: "\u{1F1EF}\u{1F1F5}", india: "\u{1F1EE}\u{1F1F3}",
};

export const TAG_CONTEXT_ICONS: Record<string, string> = {
  strikes: "\u2694\uFE0F", military: "\u{1F3AF}", navy: "\u2693",
  oil: "\u{1F6E2}\uFE0F", hormuz: "\u{1F6A2}", shipping: "\u{1F6A2}",
  markets: "\u{1F4C9}", dow: "\u{1F4C9}", gold: "\u{1FA99}",
  nuclear: "\u2622\uFE0F", iaea: "\u2622\uFE0F", natanz: "\u2622\uFE0F",
  diplomacy: "\u{1F54A}\uFE0F", "prediction": "\u{1F4CA}", polymarket: "\u{1F4CA}",
  casualties: "\u{1F480}", leadership: "\u{1F451}", succession: "\u{1F451}",
  protests: "\u270A", branded: "\u{1F3E2}", tech: "\u{1F4BB}",
  amazon: "\u2601\uFE0F", opec: "\u{1F6E2}\uFE0F", musk: "\u{1D54F}",
  gas: "\u26FD", retaliation: "\u{1F680}", "ground-invasion": "\u{1FA96}",
  aerial: "\u2708\uFE0F", sanctions: "\u{1F6AB}",
};

/** Extract up to 2 emojis for a node: [flag, contextIcon] */
export function getNodeEmojis(tags?: string[]): [string, string] {
  if (!tags?.length) return ["", ""];
  let flag = "";
  let ctx = "";
  for (const t of tags) {
    if (!flag && TAG_FLAGS[t]) flag = TAG_FLAGS[t];
    if (!ctx && TAG_CONTEXT_ICONS[t]) ctx = TAG_CONTEXT_ICONS[t];
    if (flag && ctx) break;
  }
  return [flag, ctx];
}
