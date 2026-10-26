"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";

/**
 * The page's motion layer, mounted once:
 * - smooth scrolling (Lenis), with in-page anchors scrolled through it;
 * - `.reveal` and `.lines` blocks get `is-in` as they enter the screen;
 * - a custom cursor on fine pointers that grows over links and shows `data-cursor` labels;
 * - `data-magnetic` elements lean toward the pointer.
 * Everything is skipped under reduced motion, and the cursor is skipped on touch.
 */
export function Experience() {
  const cursor = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const cleanups: (() => void)[] = [];

    // Reveals
    const targets = [...document.querySelectorAll<HTMLElement>(".reveal, .lines")];
    if (reduce || !("IntersectionObserver" in window)) targets.forEach((el) => el.classList.add("is-in"));
    else {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries)
            if (e.isIntersecting) {
              e.target.classList.add("is-in");
              io.unobserve(e.target);
            }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
      );
      targets.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    }

    // Header backdrop once the page has scrolled
    const onScrolled = () => document.documentElement.classList.toggle("is-scrolled", scrollY > 40);
    onScrolled();
    addEventListener("scroll", onScrolled, { passive: true });
    cleanups.push(() => removeEventListener("scroll", onScrolled));

    // Smooth scroll
    if (!reduce) {
      const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
      let raf = 0;
      const loop = (t: number) => {
        lenis.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      const onClick = (e: MouseEvent) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
        const id = a?.getAttribute("href");
        if (!a || !id || id.length < 2) return;
        const el = document.querySelector<HTMLElement>(id);
        if (!el) return;
        e.preventDefault();
        lenis.scrollTo(el, { offset: -72, duration: 1.4 });
      };
      document.addEventListener("click", onClick);
      cleanups.push(() => {
        cancelAnimationFrame(raf);
        document.removeEventListener("click", onClick);
        lenis.destroy();
      });
    }

    // Cursor and magnetic elements
    if (fine && !reduce && cursor.current) {
      const el = cursor.current;
      document.documentElement.classList.add("has-cursor");
      let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, raf = 0;
      const move = (e: PointerEvent) => {
        x = e.clientX;
        y = e.clientY;
        el.classList.add("is-on");
        const t = (e.target as HTMLElement).closest<HTMLElement>("a, button, [data-cursor], input, label, summary");
        const text = t?.dataset.cursor ?? "";
        el.classList.toggle("is-hover", !!t && !text);
        el.classList.toggle("is-label", !!text);
        if (label.current && label.current.textContent !== text) label.current.textContent = text;
      };
      const leave = () => el.classList.remove("is-on");
      const tick = () => {
        cx += (x - cx) * 0.2;
        cy += (y - cy) * 0.2;
        el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      addEventListener("pointermove", move, { passive: true });
      document.addEventListener("pointerleave", leave);

      const magnets = [...document.querySelectorAll<HTMLElement>("[data-magnetic]")];
      const onMag = (e: PointerEvent) => {
        const m = e.currentTarget as HTMLElement;
        const r = m.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        m.style.transform = `translate3d(${dx * 0.28}px, ${dy * 0.38}px, 0)`;
      };
      const offMag = (e: PointerEvent) => ((e.currentTarget as HTMLElement).style.transform = "");
      magnets.forEach((m) => {
        m.addEventListener("pointermove", onMag);
        m.addEventListener("pointerleave", offMag);
      });

      cleanups.push(() => {
        cancelAnimationFrame(raf);
        removeEventListener("pointermove", move);
        document.removeEventListener("pointerleave", leave);
        magnets.forEach((m) => {
          m.removeEventListener("pointermove", onMag);
          m.removeEventListener("pointerleave", offMag);
        });
        document.documentElement.classList.remove("has-cursor");
      });
    }

    return () => cleanups.forEach((f) => f());
  }, []);

  return (
    <div className="cursor" ref={cursor} aria-hidden="true">
      <span className="cursor__dot" />
      <span className="cursor__label" ref={label} />
    </div>
  );
}
