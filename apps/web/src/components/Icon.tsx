"use client";

import type { CSSProperties } from "react";

type IconName =
  | "send" | "sparkle" | "menu" | "plus" | "check" | "export" | "refresh"
  | "settings" | "close" | "bolt" | "book" | "fork" | "coffee" | "sun"
  | "grid" | "chevron" | "arrowRight" | "arrowLeft" | "bell" | "help"
  | "user" | "calendar" | "logout" | "lock" | "mail" | "bellOff" | "globe"
  | "shield" | "trash";

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
}

export function Icon({ name, size = 16, strokeWidth = 1.5, style }: IconProps) {
  const p = {
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const paths: Record<IconName, React.ReactNode> = {
    send:      <path {...p} d="M3 11L19 3L11 19L10 12L3 11Z"/>,
    sparkle:   <path {...p} d="M11 3L12.5 8.5L18 10L12.5 11.5L11 17L9.5 11.5L4 10L9.5 8.5L11 3Z"/>,
    menu:      <path {...p} d="M4 7h14M4 14h14"/>,
    plus:      <path {...p} d="M11 4v14M4 11h14"/>,
    check:     <path {...p} d="M4 11l4 4 10-10"/>,
    export:    <path {...p} d="M11 3v12M6 8l5-5 5 5M4 17h14"/>,
    refresh:   <><path {...p} d="M4 11a7 7 0 0112-4.9L18 8M18 3v5h-5M18 11a7 7 0 01-12 4.9L4 14M4 19v-5h5"/></>,
    settings:  <><path {...p} d="M11 7.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"/><path {...p} d="M17.3 13.4l1.6 1.2-1.6 2.7-1.9-.7a7 7 0 01-1.7 1l-.3 2h-3.2l-.3-2a7 7 0 01-1.7-1l-1.9.7L4.7 14.6l1.6-1.2a7 7 0 010-1.8L4.7 10.4l1.6-2.7 1.9.7a7 7 0 011.7-1l.3-2h3.2l.3 2a7 7 0 011.7 1l1.9-.7 1.6 2.7-1.6 1.2a7 7 0 010 1.8z"/></>,
    close:     <path {...p} d="M5 5l12 12M17 5L5 17"/>,
    bolt:      <path {...p} d="M12 3L5 12h5l-1 7 7-9h-5l1-7z"/>,
    book:      <><path {...p} d="M4 4h7a3 3 0 013 3v11a2 2 0 00-2-2H4V4zM18 4h-3.5M18 4v12"/></>,
    fork:      <path {...p} d="M7 4v14M14 4v5a3 3 0 003 3h1"/>,
    coffee:    <><circle {...p} cx="10" cy="11" r="5"/><path {...p} d="M15 9h2a2 2 0 010 4h-2M5 18h10"/></>,
    sun:       <><circle {...p} cx="11" cy="11" r="3.5"/><path {...p} d="M11 3v2M11 17v2M3 11h2M17 11h2M5.5 5.5l1.4 1.4M15 15l1.5 1.5M5.5 16.5l1.4-1.4M15 7l1.5-1.5"/></>,
    grid:      <><rect {...p} x="4" y="4" width="6" height="6" rx="1"/><rect {...p} x="12" y="4" width="6" height="6" rx="1"/><rect {...p} x="4" y="12" width="6" height="6" rx="1"/><rect {...p} x="12" y="12" width="6" height="6" rx="1"/></>,
    chevron:   <path {...p} d="M7 5l6 6-6 6"/>,
    arrowRight:<path {...p} d="M4 11h14M13 6l5 5-5 5"/>,
    arrowLeft: <path {...p} d="M18 11H4M9 6l-5 5 5 5"/>,
    bell:      <><path {...p} d="M6 9a5 5 0 0110 0v3l1.5 3h-13L6 12V9zM9 18a2 2 0 004 0"/></>,
    help:      <><circle {...p} cx="11" cy="11" r="7.5"/><path {...p} d="M8.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5M11 15.5v.01"/></>,
    user:      <><circle {...p} cx="11" cy="8" r="3.5"/><path {...p} d="M4 18a7 7 0 0114 0"/></>,
    calendar:  <><rect {...p} x="4" y="5" width="14" height="13" rx="2"/><path {...p} d="M4 9h14M8 3v4M14 3v4"/></>,
    logout:    <><path {...p} d="M10 4H5a1 1 0 00-1 1v12a1 1 0 001 1h5M14 8l4 3-4 3M8 11h10"/></>,
    lock:      <><rect {...p} x="5" y="10" width="12" height="9" rx="2"/><path {...p} d="M8 10V7a3 3 0 016 0v3"/></>,
    mail:      <><rect {...p} x="3" y="5" width="16" height="12" rx="2"/><path {...p} d="M3 7l8 6 8-6"/></>,
    bellOff:   <><path {...p} d="M6 9a5 5 0 0110 0v3l1.5 3h-13L6 12V9zM9 18a2 2 0 004 0"/></>,
    globe:     <><circle {...p} cx="11" cy="11" r="7.5"/><path {...p} d="M3.5 11h15M11 3.5c2 2.5 3 5 3 7.5s-1 5-3 7.5c-2-2.5-3-5-3-7.5s1-5 3-7.5z"/></>,
    shield:    <path {...p} d="M11 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6l7-3z"/>,
    trash:     <path {...p} d="M4 6h14M9 6V4h4v2M6 6l1 12h8l1-12M9 9v7M13 9v7"/>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 22 22" style={style} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
