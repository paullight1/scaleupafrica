import type { ComponentType } from "react";
import EmptyDirectory from "./EmptyDirectory";
import EmptySearch from "./EmptySearch";
import EmptyFunding from "./EmptyFunding";
import FirstRun from "./FirstRun";
import ErrorCloud from "./ErrorCloud";
import NotFound404 from "./NotFound404";
import MailSent from "./MailSent";

export type IllustrationName =
  | "empty-directory"
  | "empty-search"
  | "empty-funding"
  | "first-run"
  | "error"
  | "not-found"
  | "mail-sent";

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
};
