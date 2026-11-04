import type { ReactNode } from "react";

import { displayFont, uiFont } from "./fonts";
import { SiteFooter, SiteHeader } from "./site-chrome";

import "./landing.css";

/** Shared frame for the login, welcome and legal pages. */
export function SitePage({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  return (
    <div className={`dc ${displayFont.variable} ${uiFont.variable}`}>
      <a className="dc-skip" href="#main">
        Skip to content
      </a>
      <SiteHeader intro={false} />
      <main id="main" className="dc-main">
        {children}
      </main>
      {footer && <SiteFooter />}
    </div>
  );
}
