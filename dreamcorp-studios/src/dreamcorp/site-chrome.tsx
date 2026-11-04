import Link from "next/link";

import { SITE_NAME, CONTACT_EMAIL } from "@/site";

import { FooterScene } from "./footer-scene";
import { DreamLogo } from "./logo";
import { HeaderScroll } from "./header-scroll";

export function SiteHeader({ intro = true }: { intro?: boolean }) {
  return (
    <header className="dc-header" data-scrolled="false">
      <HeaderScroll />
      <div className="dc-header-inner">
        <Link className="dc-brand" href="/" aria-label={`${SITE_NAME} home`}>
          <DreamLogo intro={intro} />
        </Link>
        <nav className="dc-nav" aria-label="Main">
          <Link href="/#models">Models</Link>
          <Link href="/#passes">Passes</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/login">Log in</Link>
          <Link className="dc-nav-cta" href="/studio">
            Open studio
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="dc-footer">
      <FooterScene />
      <div className="dc-footer-inner">
        <div className="dc-footer-brand">
          <DreamLogo intro={false} size={40} />
          <p>Studio-grade AI images, by the day or the week.</p>
        </div>
        <nav className="dc-footer-links" aria-label="Footer">
          <div>
            <h2>Studio</h2>
            <Link href="/studio">Open studio</Link>
            <Link href="/#passes">Passes</Link>
            <Link href="/login">Log in</Link>
          </div>
          <div>
            <h2>Legal</h2>
            <Link href="/privacy">Privacy (POPIA)</Link>
            <Link href="/refunds">Refund policy</Link>
            <Link href="/terms">Terms of use</Link>
          </div>
          <div>
            <h2>Contact</h2>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </div>
        </nav>
        <p className="dc-footer-legal">
          © {year} {SITE_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
