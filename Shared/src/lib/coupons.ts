export type CouponExpiry = "day" | "week" | "month";
export type MembershipCoupon = {
  id: string;
  code: string;
  created_by: string | null;
  created_at: string;
  expires_at: string;
  max_redemptions: number | null;
  redemption_count: number;
  active: boolean;
}
export type CouponReceipt = { access_expires_at: string; already_redeemed: boolean };

export const normalizeCouponCode = (code: string) => code.trim().toUpperCase();

export function couponStatus(coupon: Pick<MembershipCoupon, "active" | "expires_at" | "max_redemptions" | "redemption_count">, now = new Date()) {
  if (!coupon.active) return "Revoked";
  if (new Date(coupon.expires_at) <= now) return "Expired";
  if (coupon.max_redemptions !== null && coupon.redemption_count >= coupon.max_redemptions) return "Used up";
  return "Available";
}

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);

/** Self-contained vector artwork, shared by the on-screen preview and both exports. */
export function couponCardSvg(coupon: Pick<MembershipCoupon, "code" | "expires_at" | "max_redemptions">, redeemUrl: string): string {
  const deadline = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(coupon.expires_at));
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" }).format(new Date(coupon.expires_at));
  const url = new URL(redeemUrl);
  const destination = `${url.host}${url.pathname}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760" role="img" aria-label="Cresciva seven-day membership gift">
  <title>Cresciva · 7 days on us · ${escapeXml(coupon.code)}</title>
  <rect width="1200" height="760" rx="32" fill="#101f36"/>
  <path d="M920 0H1200V280" fill="#ff844d"/>
  <path d="M990 50h140v140M1130 50L990 190" fill="none" stroke="#101f36" stroke-width="18"/>
  <g font-family="Arial, Helvetica, sans-serif">
    <text x="64" y="90" fill="#fff9f0" font-size="43" font-weight="700" letter-spacing="-1.5">Cresciva<tspan fill="#ff844d">.</tspan></text>
    <text x="66" y="130" fill="#cbd4e0" font-size="15" letter-spacing="3">THE COLLECTIVE / GUEST PASS</text>
    <text x="58" y="316" fill="#fff9f0" font-size="156" font-weight="700" letter-spacing="-7">7 days<tspan fill="#ff844d"> on us.</tspan></text>
    <text x="66" y="372" fill="#e1e6ee" font-size="26">Your next opportunity starts here.</text>
    <text x="66" y="414" fill="#cbd4e0" font-size="20">Explore Funding Radar with seven days of free membership.</text>
    <rect x="64" y="457" width="1072" height="128" rx="12" fill="#fff9f0"/>
    <text x="90" y="492" fill="#445066" font-size="13" font-weight="700" letter-spacing="2">YOUR MEMBERSHIP CODE</text>
    <text x="90" y="548" fill="#101f36" font-family="monospace" font-size="${coupon.code.length > 26 ? 34 : 42}" font-weight="700" letter-spacing="1">${escapeXml(coupon.code)}</text>
    <text x="66" y="630" fill="#fff9f0" font-size="20" font-weight="700">Redeem by ${deadline} · ${time} UTC</text>
    <text x="66" y="666" fill="#cbd4e0" font-size="17">${coupon.max_redemptions === null ? "Share with your community. Once per account." : "One code. One redemption. One new beginning."} No card required.</text>
    <a href="${escapeXml(url.href)}"><text x="66" y="716" fill="#ffaf85" font-size="18">${escapeXml(destination)}</text></a>
  </g>
  </svg>`;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadCouponCard(coupon: MembershipCoupon, redeemUrl: string, format: "svg" | "png") {
  const svg = couponCardSvg(coupon, redeemUrl);
  const filename = `Cresciva-${coupon.code}.${format}`;
  if (format === "svg") {
    saveBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), filename);
    return;
  }
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 760;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not create the card. Try the SVG download.");
  context.drawImage(img, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not export the card.")), "image/png"));
  saveBlob(blob, filename);
}
