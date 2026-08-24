export type HeadingBlock = { id: string; type: "heading"; text: string; level: 1 | 2 };
export type ParagraphBlock = { id: string; type: "paragraph"; text: string };
export type ImageBlock = { id: string; type: "image"; url: string; alt: string; href?: string };
export type ButtonBlock = { id: string; type: "button"; label: string; url: string };
export type DividerBlock = { id: string; type: "divider" };
export type FeatureBlock = {
  id: string;
  type: "funding" | "resource";
  title: string;
  summary: string;
  url: string;
};
export type SocialBlock = {
  id: string;
  type: "social";
  links: Array<{ label: string; url: string }>;
};

export type CampaignBlock =
  | HeadingBlock
  | ParagraphBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | FeatureBlock
  | SocialBlock;

export type AudienceFilter =
  | { mode: "all"; sources: []; joinedAfter: null; joinedBefore: null }
  | {
      mode: "segment";
      sources: string[];
      joinedAfter: string | null;
      joinedBefore: string | null;
    };

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled"
  | "archived";

export interface CampaignDraft {
  id?: string;
  internalName: string;
  subject: string;
  previewText: string;
  senderName: string;
  replyTo: string;
  blocks: CampaignBlock[];
  audience: AudienceFilter;
  revision: number;
}

export interface RenderNewsletterInput {
  subject: string;
  previewText: string;
  blocks: CampaignBlock[];
}

export interface RenderedNewsletter {
  html: string;
  text: string;
}

export interface AudienceSubscriber {
  status: "subscribed" | "unsubscribed";
  source: string | null;
  subscribedAt: string | null;
}
