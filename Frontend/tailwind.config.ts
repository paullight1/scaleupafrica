import type { Config } from "tailwindcss";
import preset from "../Shared/tailwind.preset";

export default {
  presets: [preset],
  // ../Shared/src must be scanned or classes used only by the shared kit get purged.
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../Shared/src/**/*.{ts,tsx}"],
} satisfies Config;
