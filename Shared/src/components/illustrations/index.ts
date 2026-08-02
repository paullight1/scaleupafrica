import type { ComponentType } from "react";
import EmptyDirectory from "./EmptyDirectory";
import EmptySearch from "./EmptySearch";
import EmptyFunding from "./EmptyFunding";
import FirstRun from "./FirstRun";
import ErrorCloud from "./ErrorCloud";
import NotFound404 from "./NotFound404";
import MailSent from "./MailSent";
import HeroGrowth from "./HeroGrowth";
import ProblemInvisible from "./ProblemInvisible";
import ProblemScattered from "./ProblemScattered";
import ProblemTime from "./ProblemTime";
import ProfileIncomplete from "./ProfileIncomplete";
import StepList from "./StepList";
import StepDiscovered from "./StepDiscovered";
import StepFunding from "./StepFunding";
import ReassuranceDoes from "./ReassuranceDoes";
import ReassuranceDoesnt from "./ReassuranceDoesnt";
import LockedVault from "./LockedVault";
import EmptyInsights from "./EmptyInsights";
import CtaLaunch from "./CtaLaunch";

export type IllustrationName =
  | "empty-directory"
  | "empty-search"
  | "empty-funding"
  | "first-run"
  | "error"
  | "not-found"
  | "mail-sent"
  // Landing page — docs/superpowers/specs/2026-08-02-illustration-first-landing-design.md
  | "hero-growth"
  | "problem-invisible"
  | "problem-scattered"
  | "problem-time"
  | "profile-incomplete"
  | "step-list"
  | "step-discovered"
  | "step-funding"
  | "reassurance-does"
  | "reassurance-doesnt"
  | "locked-vault"
  | "empty-insights"
  | "cta-launch";

export const illustrationRegistry: Record<
  IllustrationName,
  ComponentType<{ className?: string }>
> = {
  "empty-directory": EmptyDirectory,
  "empty-search": EmptySearch,
  "empty-funding": EmptyFunding,
  "first-run": FirstRun,
  error: ErrorCloud,
  "not-found": NotFound404,
  "mail-sent": MailSent,
  "hero-growth": HeroGrowth,
  "problem-invisible": ProblemInvisible,
  "problem-scattered": ProblemScattered,
  "problem-time": ProblemTime,
  "profile-incomplete": ProfileIncomplete,
  "step-list": StepList,
  "step-discovered": StepDiscovered,
  "step-funding": StepFunding,
  "reassurance-does": ReassuranceDoes,
  "reassurance-doesnt": ReassuranceDoesnt,
  "locked-vault": LockedVault,
  "empty-insights": EmptyInsights,
  "cta-launch": CtaLaunch,
};
