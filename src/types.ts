/** Visual theme. dark is the default. */
export type Theme = "dark" | "light";

/** Output size. linkedin-square (1080x1080) is the default. */
export type FormatId = "linkedin-square" | "linkedin-portrait";

export interface Meta {
  theme?: Theme;
  /** Highlight color as a #RRGGBB hex string. */
  accent?: string;
  format?: FormatId;
}

interface SlideBase {
  /** Where the facts on this slide come from. Drawn as a footer line. */
  source?: string;
  /** Word or short phrase inside the slide text drawn in the accent color. */
  highlight?: string;
}

export interface HookSlide extends SlideBase {
  type: "hook";
  text: string;
}

export interface TextSlide extends SlideBase {
  type: "text";
  title: string;
  text: string;
}

export interface NumberSlide extends SlideBase {
  type: "number";
  /** The big figure, for example "30.000" or "200x". */
  value: string;
  label: string;
}

export interface ListSlide extends SlideBase {
  type: "list";
  title: string;
  items: string[];
}

export interface QuoteSlide extends SlideBase {
  type: "quote";
  text: string;
  author: string;
}

export interface CtaSlide extends SlideBase {
  type: "cta";
  text: string;
  handle: string;
}

export type Slide = HookSlide | TextSlide | NumberSlide | ListSlide | QuoteSlide | CtaSlide;

export type SlideType = Slide["type"];

export interface Deck {
  meta?: Meta;
  slides: Slide[];
}

export const SLIDE_TYPES: readonly SlideType[] = ["hook", "text", "number", "list", "quote", "cta"];
