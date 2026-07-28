"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function LandingMotion({ children, refreshKey }: { children: React.ReactNode; refreshKey: string }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      heroTimeline.fromTo(
        "[data-hero-item]",
        { autoAlpha: 0, y: isMobile ? 16 : 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.48,
          stagger: 0.07,
          clearProps: "opacity,visibility,transform",
        },
      );

      gsap.to("[data-hero-glow]", {
        yPercent: isMobile ? 5 : 12,
        ease: "none",
        scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom top", scrub: 0.8 },
      });

      gsap.utils.toArray<HTMLElement>("[data-reveal-section]").forEach((section) => {
        const heading = section.querySelector<HTMLElement>("[data-reveal-heading]");
        const cards = Array.from(section.querySelectorAll<HTMLElement>("[data-reveal-card]"));

        if (heading) {
          ScrollTrigger.create({
            trigger: heading,
            start: "top 94%",
            once: true,
            onEnter: () => {
              gsap.fromTo(heading, { autoAlpha: 0, y: isMobile ? 12 : 20 }, { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.48, ease: "power2.out", clearProps: "opacity,visibility,transform" });
            },
          });
        }

        if (cards.length > 0) {
          ScrollTrigger.create({
            trigger: cards[0],
            start: "top 96%",
            once: true,
            onEnter: () => {
              gsap.fromTo(cards, { autoAlpha: 0, y: isMobile ? 10 : 18, scale: 0.99 }, { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.42, stagger: 0.045, ease: "power2.out", clearProps: "opacity,visibility,transform" });
            },
          });
        }
      });

      return () => heroTimeline.kill();
    });
    return () => media.revert();
  }, { scope });

  useGSAP(() => {
    const frame = window.requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => window.cancelAnimationFrame(frame);
  }, { dependencies: [refreshKey], scope });

  return <div ref={scope} className="contents">{children}</div>;
}
