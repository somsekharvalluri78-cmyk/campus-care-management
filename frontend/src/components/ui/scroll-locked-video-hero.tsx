"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, Sparkles } from "lucide-react";

export interface MetroHeroProps {
  videoSrc?: string;
  posterSrc?: string;
  title?: string;
  subtitle?: string;
  scrollHint?: string;
  tagline?: string;
  signature?: { name: string; url: string } | false;
  scrubDistance?: number;
  className?: string;
  style?: React.CSSProperties;
  onComplete?: () => void;
}

const DEFAULT_VIDEO = "/campus-intro.webm";
const FALLBACK_VIDEO = "https://cdn.21st.dev/assets/mirror/21/21a77eac28eacbb7e142016eefeaa0b4a766619e51113629a3bc6df6af066c0f.mp4";
const DEFAULT_POSTER = "/campus-hero-poster.jpg";
const SANS = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const COL_BG = "#050f0e";
const COL_TEXT = "#f2f7f4";
const COL_EMERALD = "#2dd4bf";

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export default function MetroHero({
  videoSrc = DEFAULT_VIDEO,
  posterSrc = DEFAULT_POSTER,
  title = "A BETTER CAMPUS STARTS WITH BEING HEARD.",
  subtitle = "Every concern matters. Every voice deserves attention. Together, we can build a safer, smarter, and more supportive campus.",
  scrollHint = "SCROLL DOWN TO EXPLORE",
  tagline = "YOUR CAMPUS. YOUR VOICE. OUR COMMITMENT.",
  signature = false,
  scrubDistance = 1800,
  className = "",
  style,
  onComplete,
}: MetroHeroProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const percentBadgeRef = useRef<HTMLSpanElement>(null);

  const [ready, setReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [activeVideoSrc, setActiveVideoSrc] = useState(videoSrc);
  const [isFullyScrolled, setIsFullyScrolled] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const triggerCompletion = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 450);
  }, [onComplete]);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let duration = 0;
    let rafId = 0;
    let targetProgress = 0;
    let currentProgress = 0;
    let isSeeking = false;
    let pendingTime: number | null = null;
    let touchStartY = 0;
    let completedTriggered = false;

    const onLoadedData = () => {
      duration = video.duration || 0;
      setReady(true);
      setVideoError(false);
      if (reduceMotion && duration > 0) {
        video.currentTime = duration * 0.5;
      }
    };

    const onError = () => {
      if (activeVideoSrc !== FALLBACK_VIDEO) {
        setActiveVideoSrc(FALLBACK_VIDEO);
      } else {
        setVideoError(true);
        setReady(true);
      }
    };

    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("error", onError);

    // Warm up mobile video playback silently
    const kickstartLoad = () => {
      const p = video.play();
      if (p && typeof p.then === "function") {
        p.then(() => video.pause()).catch(() => {});
      } else {
        video.pause();
      }
    };
    kickstartLoad();

    const onSeeked = () => {
      isSeeking = false;
      if (pendingTime !== null) {
        const t = pendingTime;
        pendingTime = null;
        isSeeking = true;
        video.currentTime = t;
      }
    };
    video.addEventListener("seeked", onSeeked);

    function seekTo(t: number) {
      if (isSeeking) {
        pendingTime = t;
        return;
      }
      isSeeking = true;
      video.currentTime = t;
    }

    function addDelta(deltaY: number) {
      // deltaY > 0 means user is scrolling DOWN (moving forward in video)
      // deltaY < 0 means user is scrolling UP (moving backward in video)
      const next = clamp(targetProgress + deltaY / scrubDistance, 0, 1);
      targetProgress = next;

      if (targetProgress >= 0.96) {
        setIsFullyScrolled(true);
        // Only trigger completion if user has completed the entire scrub AND scrolls down further
        if (targetProgress >= 0.999 && deltaY > 15 && !completedTriggered) {
          completedTriggered = true;
          triggerCompletion();
        }
      } else {
        setIsFullyScrolled(false);
        completedTriggered = false;
      }

      return true;
    }

    const onWheel = (e: WheelEvent) => {
      addDelta(e.deltaY);
      e.preventDefault();
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? touchStartY;
      const deltaY = (touchStartY - y) * 1.6; // touchStartY - y > 0 when swiping finger UP (scrolling DOWN)
      touchStartY = y;
      addDelta(deltaY);
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        addDelta(140);
        e.preventDefault();
      } else if (e.key === "PageDown" || e.key === " ") {
        addDelta(280);
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        addDelta(-140);
        e.preventDefault();
      } else if (e.key === "PageUp") {
        addDelta(-280);
        e.preventDefault();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    function frame() {
      currentProgress += (targetProgress - currentProgress) * 0.16;

      if (duration > 0 && !videoError) {
        seekTo(currentProgress * duration);
      }

      if (videoRef.current) {
        const scale = 1 + currentProgress * 0.08;
        videoRef.current.style.transform = `scale(${scale})`;
      }

      // Percentage Indicator
      if (percentBadgeRef.current) {
        const pct = Math.round(currentProgress * 100);
        percentBadgeRef.current.innerText = `${pct}%`;
      }

      // Title & Subtitle Fade & Blur as user scrolls down
      if (titleRef.current) {
        const t = 1 - clamp(currentProgress / 0.38, 0, 1);
        titleRef.current.style.opacity = String(t);
        titleRef.current.style.transform = `translateY(${(1 - t) * -28}px) scale(${0.96 + t * 0.04})`;
        titleRef.current.style.filter = `blur(${(1 - t) * 12}px)`;
      }

      if (subtitleRef.current) {
        const t = 1 - clamp(currentProgress / 0.32, 0, 1);
        subtitleRef.current.style.opacity = String(t);
        subtitleRef.current.style.transform = `translateY(${(1 - t) * -16}px)`;
      }

      // Bottom Scroll Hint fades out as soon as user begins scrolling
      if (hintRef.current) {
        hintRef.current.style.opacity = currentProgress > 0.05 ? "0" : "1";
      }

      // Closing Tagline Reveal: only appears as user approaches the end (0.65 -> 1.0)
      if (taglineRef.current) {
        const t = clamp((currentProgress - 0.65) / 0.30, 0, 1);
        taglineRef.current.style.opacity = String(t);
        taglineRef.current.style.transform = `translateY(${(1 - t) * 24}px) scale(${0.96 + t * 0.04})`;
        taglineRef.current.style.filter = `blur(${(1 - t) * 10}px)`;
        taglineRef.current.style.pointerEvents = t > 0.7 ? "auto" : "none";
      }

      // Bottom Scrub Progress Bar
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${currentProgress})`;
      }

      rafId = requestAnimationFrame(frame);
    }

    if (!reduceMotion) {
      rafId = requestAnimationFrame(frame);
    } else {
      setIsFullyScrolled(true);
      if (progressBarRef.current) progressBarRef.current.style.transform = "scaleX(1)";
    }

    return () => {
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("error", onError);
      video.removeEventListener("seeked", onSeeked);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafId);
    };
  }, [scrubDistance, triggerCompletion, activeVideoSrc, videoError]);

  return (
    <div
      ref={sectionRef}
      id="campus-intro-hero"
      className={`campus-care-hero ${className}`}
      style={{
        position: "relative",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        background: COL_BG,
        opacity: isTransitioning ? 0 : 1,
        transform: isTransitioning ? "translateY(-40px) scale(0.98)" : "none",
        transition: "opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
        touchAction: "none",
        userSelect: "none",
        ...style,
      }}
    >
      {/* Background Poster Fallback (underneath video) */}
      <img
        src={posterSrc}
        alt="Campus Care Collegiate Architecture"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transformOrigin: "center center",
          opacity: 0.9,
          filter: "brightness(0.85) contrast(1.05)",
          pointerEvents: "none",
        }}
      />

      {/* Cinematic Ambient Overlay Video */}
      {!videoError && (
        <video
          ref={videoRef}
          src={activeVideoSrc}
          poster={posterSrc}
          muted
          playsInline
          preload="auto"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: ready ? 0.92 : 0,
            transformOrigin: "center center",
            willChange: "transform",
            transition: "opacity 0.8s ease-in-out",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Premium Multi-Stop Gradient Veil */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(13, 60, 54, 0.45) 0%, rgba(5, 15, 14, 0.75) 60%, rgba(3, 8, 7, 0.94) 100%), linear-gradient(180deg, rgba(5,15,14,0.4) 0%, transparent 25%, rgba(5,15,14,0.2) 65%, rgba(5,15,14,0.96) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Top Navbar / Brand Header (NO SHORTCUTS - strictly branding) */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px clamp(20px, 4vw, 48px)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#042f2e",
              fontWeight: 800,
              fontSize: 19,
              fontFamily: SANS,
              boxShadow: "0 4px 20px rgba(45, 212, 191, 0.35)",
            }}
          >
            c
          </div>
          <div>
            <div
              style={{
                fontFamily: SANS,
                fontWeight: 800,
                fontSize: 17,
                letterSpacing: "-0.02em",
                color: "#ffffff",
                lineHeight: 1.1,
              }}
            >
              campus<span style={{ color: COL_EMERALD }}>care</span>
            </div>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.15em",
                color: "rgba(255,255,255,0.6)",
                textTransform: "uppercase",
              }}
            >
              Student Support Services
            </div>
          </div>
        </div>

        {/* Right Status Badge (No shortcut buttons) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "8px 16px",
            borderRadius: 9999,
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(12px)",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: COL_EMERALD,
              boxShadow: "0 0 10px #2dd4bf",
            }}
          />
          <span
            style={{
              fontFamily: SANS,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.85)",
              textTransform: "uppercase",
            }}
          >
            EST. 2026 • NORTHFIELD
          </span>
          <span
            ref={percentBadgeRef}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              color: COL_EMERALD,
              marginLeft: 4,
              borderLeft: "1px solid rgba(255,255,255,0.15)",
              paddingLeft: 8,
            }}
          >
            0%
          </span>
        </div>
      </header>

      {/* Opening Intro Content (Stage 1 Start: 0% -> 35%) */}
      <div
        ref={titleRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 clamp(20px, 6vw, 120px)",
          textAlign: "center",
          pointerEvents: "none",
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "6px 14px",
            borderRadius: 9999,
            background: "rgba(45, 212, 191, 0.12)",
            border: "1px solid rgba(45, 212, 191, 0.3)",
            color: COL_EMERALD,
            fontFamily: SANS,
            fontSize: "clamp(11px, 1.2vw, 12px)",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 20,
            backdropFilter: "blur(8px)",
          }}
        >
          <Sparkles size={13} />
          NORTHFIELD COLLEGE • CAMPUS CARE
        </div>

        <h1
          style={{
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: "clamp(32px, 5.2vw, 76px)",
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            color: COL_TEXT,
            textShadow: "0 4px 36px rgba(0,0,0,0.65)",
            maxWidth: 1050,
            margin: "0 0 20px 0",
            willChange: "transform, filter, opacity",
          }}
        >
          {title}
        </h1>

        <p
          ref={subtitleRef}
          style={{
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: "clamp(15px, 1.6vw, 20px)",
            lineHeight: 1.5,
            color: "rgba(235, 245, 242, 0.85)",
            maxWidth: 720,
            margin: 0,
            textShadow: "0 2px 18px rgba(0,0,0,0.6)",
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Payoff Tagline (Stage 1 End: 65% -> 100%) */}
      <div
        ref={taglineRef}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 clamp(20px, 8vw, 140px)",
          textAlign: "center",
          opacity: 0,
          pointerEvents: "none",
          zIndex: 5,
        }}
      >
        <div
          style={{
            color: COL_EMERALD,
            fontFamily: SANS,
            fontSize: "clamp(12px, 1.4vw, 14px)",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          GRIEVANCE REDRESSAL & SUPPORT
        </div>
        <span
          style={{
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: "clamp(26px, 4.4vw, 62px)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            color: "#ffffff",
            textShadow: "0 6px 36px rgba(0,0,0,0.8)",
            maxWidth: 860,
          }}
        >
          {tagline}
        </span>

        {/* Revealed ONLY when user has scrolled down completely to 100% */}
        {isFullyScrolled && (
          <button
            type="button"
            onClick={triggerCompletion}
            style={{
              marginTop: 34,
              background: "linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)",
              border: "none",
              borderRadius: 9999,
              padding: "16px 38px",
              color: "#042f2e",
              fontFamily: SANS,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "0.04em",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 6px 32px rgba(45, 212, 191, 0.5)",
              pointerEvents: "auto",
              animation: "campus-button-pulse 2s infinite ease-in-out",
            }}
          >
            <style>{`
              @keyframes campus-button-pulse {
                0%, 100% { transform: scale(1); box-shadow: 0 6px 32px rgba(45, 212, 191, 0.45); }
                50% { transform: scale(1.03); box-shadow: 0 8px 36px rgba(45, 212, 191, 0.7); }
              }
            `}</style>
            <span>Proceed to Sign In</span>
            <ChevronDown size={18} />
          </button>
        )}
      </div>

      {/* Floating Bottom Scroll Hint (Guides user to scroll DOWN) */}
      <div
        ref={hintRef}
        style={{
          position: "absolute",
          left: "50%",
          bottom: "clamp(24px, 5vh, 48px)",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          color: "rgba(240, 248, 245, 0.85)",
          fontFamily: SANS,
          fontSize: "clamp(11px, 1.2vw, 12px)",
          fontWeight: 700,
          letterSpacing: "0.24em",
          transition: "opacity 0.4s ease",
          zIndex: 8,
          pointerEvents: "none",
          textShadow: "0 2px 10px rgba(0,0,0,0.6)",
        }}
      >
        <span>{scrollHint}</span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(8px)",
            animation: "campus-hero-bounce 1.6s ease-in-out infinite",
          }}
        >
          <style>{`
            @keyframes campus-hero-bounce {
              0%, 100% { transform: translateY(0); opacity: 0.7; }
              50% { transform: translateY(4px); opacity: 1; }
            }
          `}</style>
          <ChevronDown size={16} />
        </div>
      </div>

      {/* Scrub Progress Bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          background: "rgba(255, 255, 255, 0.12)",
          zIndex: 9,
        }}
      >
        <div
          ref={progressBarRef}
          style={{
            height: "100%",
            width: "100%",
            background: "linear-gradient(90deg, #0d9488, #2dd4bf, #a7f3d0)",
            transform: "scaleX(0)",
            transformOrigin: "left center",
            boxShadow: "0 0 12px rgba(45, 212, 191, 0.7)",
          }}
        />
      </div>

      {signature && (
        <span
          style={{
            position: "absolute",
            right: "clamp(12px, 2.5vw, 24px)",
            bottom: "clamp(10px, 2vw, 18px)",
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: "clamp(11px, 1.4vw, 13px)",
            letterSpacing: "0.01em",
            color: "rgba(220,224,232,0.6)",
            zIndex: 10,
          }}
        >
          by{" "}
          <a
            href={signature.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "rgba(220,224,232,0.8)",
              textDecoration: "none",
            }}
          >
            {signature.name}
          </a>
        </span>
      )}
    </div>
  );
}
