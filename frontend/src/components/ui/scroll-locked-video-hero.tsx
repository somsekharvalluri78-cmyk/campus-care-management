"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, Sparkles, Compass } from "lucide-react";

export interface MetroHeroProps {
  videoSrc?: string;
  posterSrc?: string;
  secondaryPosterSrc?: string;
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

const DEFAULT_POSTER = "/campus-wallpaper.jpg";
const DEFAULT_SECONDARY_POSTER = "/campus-town-life.jpg";
const DEFAULT_VIDEO = "/campus-intro.webm";
const FALLBACK_VIDEO = "https://cdn.21st.dev/assets/mirror/21/21a77eac28eacbb7e142016eefeaa0b4a766619e51113629a3bc6df6af066c0f.mp4";
const SANS = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const COL_BG = "#061311";
const COL_TEXT = "#ffffff";
const COL_EMERALD = "#2dd4bf";

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export default function MetroHero({
  videoSrc = DEFAULT_VIDEO,
  posterSrc = DEFAULT_POSTER,
  secondaryPosterSrc = DEFAULT_SECONDARY_POSTER,
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
  const scene1Ref = useRef<HTMLDivElement>(null);
  const scene2Ref = useRef<HTMLDivElement>(null);
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
  const [isAutoMotionActive, setIsAutoMotionActive] = useState(false);

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
    if (!section) return;

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

    // 2-MINUTE INACTIVITY CONTINUOUS MOTION CONTROLLER
    const IDLE_TIMEOUT_MS = 120_000; // 2 minutes (120,000 ms)
    let idleTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let isAutoMoving = false;
    let autoMoveStartTime = 0;

    function startAutoMotion() {
      // Auto-motion only activates if user has not completed the scrub and has not entered login
      if (!completedTriggered && targetProgress < 0.92) {
        isAutoMoving = true;
        autoMoveStartTime = performance.now();
        setIsAutoMotionActive(true);
      }
    }

    function resetIdleTimer() {
      if (isAutoMoving) {
        isAutoMoving = false;
        setIsAutoMotionActive(false);
      }
      if (idleTimeoutId) {
        clearTimeout(idleTimeoutId);
      }
      idleTimeoutId = setTimeout(() => {
        startAutoMotion();
      }, IDLE_TIMEOUT_MS);
    }

    // Initialize 2-minute timer on load
    resetIdleTimer();

    const onLoadedData = () => {
      if (video) {
        duration = video.duration || 0;
        setReady(true);
        setVideoError(false);
        if (reduceMotion && duration > 0) {
          video.currentTime = duration * 0.5;
        }
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

    if (video) {
      video.addEventListener("loadeddata", onLoadedData);
      video.addEventListener("error", onError);

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
    }

    function seekTo(t: number) {
      if (!video) return;
      if (isSeeking) {
        pendingTime = t;
        return;
      }
      isSeeking = true;
      video.currentTime = t;
    }

    function addDelta(deltaY: number) {
      // Any user interaction cancels screensaver auto-motion and resets the 2-minute idle timer
      resetIdleTimer();

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
      resetIdleTimer();
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

    const onMouseMove = () => {
      resetIdleTimer();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    function frame() {
      // 2-MINUTE INACTIVITY LIVE MOTION CONTROLLER
      if (isAutoMoving) {
        const elapsed = (performance.now() - autoMoveStartTime) / 1000;
        // Continuous gentle oscillation across the 4K quad and collegiate town (0.12 <-> 0.68)
        // CRITICAL: NEVER EXCEEDS 0.70 - CANNOT ENTER INTO LOGIN PAGE!
        const autoP = 0.40 + Math.sin(elapsed * 0.32) * 0.28;
        targetProgress = clamp(autoP, 0.12, 0.70);
        setIsFullyScrolled(false);
      }

      currentProgress += (targetProgress - currentProgress) * 0.14;

      if (duration > 0 && !videoError && video) {
        seekTo(currentProgress * duration);
      }

      // 4K SCENE 1: AERIAL CAMPUS QUAD & COLLEGIATE TOWN
      if (scene1Ref.current) {
        const p = currentProgress;
        const scale = 1 + p * 0.18;
        const panX = -p * 45; // Camera glide towards the collegiate town on the right
        const panY = -p * 22;
        const opacity = p < 0.35 ? 1 : 1 - clamp((p - 0.35) / 0.30, 0, 1);
        scene1Ref.current.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`;
        scene1Ref.current.style.opacity = String(opacity);
      }

      // 4K SCENE 2: BUSTLING COLLEGIATE TOWN AVENUE & STUDENT LIFE
      if (scene2Ref.current) {
        const p = currentProgress;
        const opacity = p < 0.30 ? 0 : clamp((p - 0.30) / 0.28, 0, 1);
        const scale = 1.05 + clamp((p - 0.30), 0, 1) * 0.15;
        const panY = (1 - p) * 20;
        scene2Ref.current.style.transform = `translate3d(0, ${panY}px, 0) scale(${scale})`;
        scene2Ref.current.style.opacity = String(opacity);
      }

      // Video Layer Sync (if active)
      if (videoRef.current) {
        const scale = 1 + currentProgress * 0.12;
        videoRef.current.style.transform = `scale(${scale})`;
      }

      // Percentage Indicator
      if (percentBadgeRef.current) {
        const pct = Math.round(currentProgress * 100);
        percentBadgeRef.current.innerText = `${pct}%`;
      }

      // Title & Subtitle Fade & Blur as user scrubs forward
      if (titleRef.current) {
        const t = 1 - clamp(currentProgress / 0.36, 0, 1);
        titleRef.current.style.opacity = String(t);
        titleRef.current.style.transform = `translateY(${(1 - t) * -28}px) scale(${0.96 + t * 0.04})`;
        titleRef.current.style.filter = `blur(${(1 - t) * 10}px)`;
      }

      if (subtitleRef.current) {
        const t = 1 - clamp(currentProgress / 0.30, 0, 1);
        subtitleRef.current.style.opacity = String(t);
        subtitleRef.current.style.transform = `translateY(${(1 - t) * -16}px)`;
      }

      // Bottom Scroll Hint fades out as soon as user begins scrolling or auto-motion starts
      if (hintRef.current) {
        hintRef.current.style.opacity = currentProgress > 0.05 ? "0" : "1";
      }

      // Closing Tagline Reveal: only appears as user approaches the end (0.70 -> 1.0)
      if (taglineRef.current) {
        const t = clamp((currentProgress - 0.70) / 0.25, 0, 1);
        taglineRef.current.style.opacity = String(t);
        taglineRef.current.style.transform = `translateY(${(1 - t) * 24}px) scale(${0.96 + t * 0.04})`;
        taglineRef.current.style.filter = `blur(${(1 - t) * 8}px)`;
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
      if (idleTimeoutId) clearTimeout(idleTimeoutId);
      if (video) {
        video.removeEventListener("loadeddata", onLoadedData);
        video.removeEventListener("error", onError);
      }
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousemove", onMouseMove);
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
      {/* 4K SCENE 1: Crystal-Clear Aerial Campus Quad & Collegiate Town */}
      <div
        ref={scene1Ref}
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${posterSrc})`,
          backgroundPosition: "center center",
          backgroundSize: "cover",
          transformOrigin: "center center",
          willChange: "transform, opacity",
          filter: "contrast(1.02) saturate(1.06)",
        }}
      />

      {/* 4K SCENE 2: Crystal-Clear Bustling Collegiate Town & Campus Life */}
      <div
        ref={scene2Ref}
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${secondaryPosterSrc})`,
          backgroundPosition: "center center",
          backgroundSize: "cover",
          transformOrigin: "center center",
          willChange: "transform, opacity",
          opacity: 0,
          filter: "contrast(1.02) saturate(1.06)",
        }}
      />

      {/* Ambient Motion Video Overlay (subtle, crystal-clear blend without grain) */}
      {!videoError && (
        <video
          ref={videoRef}
          src={activeVideoSrc}
          muted
          playsInline
          preload="auto"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: ready ? 0.45 : 0,
            transformOrigin: "center center",
            willChange: "transform",
            transition: "opacity 0.8s ease-in-out",
            pointerEvents: "none",
            mixBlendMode: "screen",
          }}
        />
      )}

      {/* Crystal-Clear Lens Vignette (Zero muddy green veils - 100% luminous 4K clarity) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0.12) 18%, transparent 35%, transparent 68%, rgba(0, 0, 0, 0.25) 82%, rgba(0, 0, 0, 0.70) 100%)",
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
                textShadow: "0 2px 10px rgba(0,0,0,0.7)",
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
                color: "rgba(255,255,255,0.75)",
                textTransform: "uppercase",
                textShadow: "0 1px 8px rgba(0,0,0,0.7)",
              }}
            >
              Student Support Services
            </div>
          </div>
        </div>

        {/* Right Status Badge (Official portal indicator + live scrub progress) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "8px 16px",
            borderRadius: 9999,
            background: "rgba(0, 0, 0, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            backdropFilter: "blur(14px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
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
              color: "rgba(255,255,255,0.92)",
              textTransform: "uppercase",
            }}
          >
            CAMPUS CARE • OFFICIAL PORTAL
          </span>
          <span
            ref={percentBadgeRef}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              color: COL_EMERALD,
              marginLeft: 4,
              borderLeft: "1px solid rgba(255,255,255,0.2)",
              paddingLeft: 8,
            }}
          >
            0%
          </span>
        </div>
      </header>

      {/* 2-Minute Idle Continuous Screensaver Indicator */}
      {isAutoMotionActive && (
        <div
          style={{
            position: "absolute",
            top: 76,
            right: "clamp(20px, 4vw, 48px)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 9999,
            background: "rgba(13, 148, 136, 0.32)",
            border: "1px solid rgba(45, 212, 191, 0.45)",
            backdropFilter: "blur(14px)",
            color: "#5eead4",
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            zIndex: 10,
            boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
            animation: "campus-fade-in 0.4s ease",
          }}
        >
          <style>{`
            @keyframes campus-fade-in {
              from { opacity: 0; transform: translateY(-6px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes campus-dot-pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.4; transform: scale(0.85); }
            }
          `}</style>
          <Compass size={13} style={{ animation: "campus-dot-pulse 2s infinite" }} />
          <span>Cinematic Live Motion • Scroll to explore</span>
        </div>
      )}

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
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(45, 212, 191, 0.4)",
            color: COL_EMERALD,
            fontFamily: SANS,
            fontSize: "clamp(11px, 1.2vw, 12px)",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 20,
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 18px rgba(0,0,0,0.3)",
          }}
        >
          <Sparkles size={13} />
          CAMPUS CARE • STUDENT SUPPORT SERVICES
        </div>

        <h1
          style={{
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: "clamp(32px, 5.2vw, 76px)",
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            color: COL_TEXT,
            textShadow: "0 4px 36px rgba(0,0,0,0.85)",
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
            color: "rgba(255, 255, 255, 0.92)",
            maxWidth: 720,
            margin: 0,
            textShadow: "0 2px 18px rgba(0,0,0,0.8)",
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Payoff Tagline (Stage 1 End: 70% -> 100%) */}
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
            textShadow: "0 2px 12px rgba(0,0,0,0.8)",
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
            textShadow: "0 6px 36px rgba(0,0,0,0.9)",
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
              boxShadow: "0 8px 36px rgba(45, 212, 191, 0.55)",
              pointerEvents: "auto",
              animation: "campus-button-pulse 2s infinite ease-in-out",
            }}
          >
            <style>{`
              @keyframes campus-button-pulse {
                0%, 100% { transform: scale(1); box-shadow: 0 8px 36px rgba(45, 212, 191, 0.5); }
                50% { transform: scale(1.03); box-shadow: 0 10px 42px rgba(45, 212, 191, 0.8); }
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
          color: "rgba(255, 255, 255, 0.95)",
          fontFamily: SANS,
          fontSize: "clamp(11px, 1.2vw, 12px)",
          fontWeight: 700,
          letterSpacing: "0.24em",
          transition: "opacity 0.4s ease",
          zIndex: 8,
          pointerEvents: "none",
          textShadow: "0 2px 14px rgba(0,0,0,0.85)",
        }}
      >
        <span>{scrollHint}</span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9999,
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(10px)",
            animation: "campus-hero-bounce 1.6s ease-in-out infinite",
          }}
        >
          <style>{`
            @keyframes campus-hero-bounce {
              0%, 100% { transform: translateY(0); opacity: 0.8; }
              50% { transform: translateY(5px); opacity: 1; }
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
          background: "rgba(255, 255, 255, 0.15)",
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
            boxShadow: "0 0 14px rgba(45, 212, 191, 0.8)",
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
            color: "rgba(255,255,255,0.7)",
            zIndex: 10,
            textShadow: "0 1px 8px rgba(0,0,0,0.8)",
          }}
        >
          by{" "}
          <a
            href={signature.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "rgba(255,255,255,0.9)",
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
