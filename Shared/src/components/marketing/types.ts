/**
 * The three marketing surfaces. `light` and `tinted` are the app's own light
 * tokens; `dark` is the `--mk-*` band, which stays dark in both themes.
 */
export type Tone = "light" | "tinted" | "dark";

export type Stat = { value: string; label: string };

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  avatarUrl?: string;
};
