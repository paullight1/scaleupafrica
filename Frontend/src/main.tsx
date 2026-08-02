import "@fontsource/sora/latin-500.css";
import "@fontsource/sora/latin-600.css";
import "@fontsource/sora/latin-700.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@shared/styles/index.css";
import { onSignOut } from "@shared/hooks/signOutCleanup";
import { clearFundingCache } from "@/lib/fundingCache";

// Shared auth owns sign-out but must not know about this app's feature caches.
// Clear per-user funding results from localStorage (shared/family devices).
onSignOut(() => clearFundingCache());

createRoot(document.getElementById("root")!).render(<App />);
