import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";

/* Two faces, two jobs. Bricolage Grotesque is the display voice: its ink traps
   and optical sizes give prices and headlines some character. Instrument Sans
   is the working face for the studio and body copy. */

export const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-dc-display",
  display: "swap",
});

export const uiFont = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-dc-ui",
  display: "swap",
});
