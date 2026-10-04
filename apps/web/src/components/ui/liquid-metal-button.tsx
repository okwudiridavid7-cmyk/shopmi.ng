"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ShaderHandle = { setSpeed?: (speed?: number) => void; dispose?: () => void; destroy?: () => void };

interface LiquidMetalButtonProps {
  label: string;
  href?: string;
  onClick?: () => void;
  /** Rendered before the label. */
  icon?: ReactNode;
  /** Rendered after the label, e.g. an arrow badge. */
  trailing?: ReactNode;
  className?: string;
  contentClassName?: string;
}

const IDLE = 0.6;
const HOVER = 1;
const BURST = 2.4;

/** Dark pill with an animated liquid-metal rim (WebGL). Falls back to a static silver rim. */
export function LiquidMetalButton({
  label,
  href,
  onClick,
  icon,
  trailing,
  className,
  contentClassName,
}: LiquidMetalButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const shaderRef = useRef<HTMLSpanElement>(null);
  const mount = useRef<ShaderHandle | null>(null);
  const hoveredRef = useRef(false);
  const reduceRef = useRef(false);
  const rippleId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    void import("@paper-design/shaders")
      .then(({ ShaderMount, liquidMetalFragmentShader, LiquidMetalShapes, ShaderFitOptions }) => {
        if (cancelled || !shaderRef.current) return;
        mount.current = new ShaderMount(
          shaderRef.current,
          liquidMetalFragmentShader,
          {
            u_colorBack: [0, 0, 0, 0],
            u_colorTint: [1, 1, 1, 1],
            u_isImage: false,
            u_repetition: 4,
            u_softness: 0.5,
            u_shiftRed: 0.3,
            u_shiftBlue: 0.3,
            u_distortion: 0,
            u_contour: 0,
            u_angle: 45,
            u_shape: LiquidMetalShapes.none,
            u_fit: ShaderFitOptions.cover,
            u_scale: 1,
            u_rotation: 0,
            u_originX: 0.5,
            u_originY: 0.5,
            u_offsetX: 0,
            u_offsetY: 0,
            u_worldWidth: 0,
            u_worldHeight: 0,
          },
          undefined,
          reduceRef.current ? 0 : IDLE
        ) as unknown as ShaderHandle;
      })
      .catch(() => {
        // The static silver rim stays visible.
      });

    return () => {
      cancelled = true;
      mount.current?.dispose?.();
      mount.current?.destroy?.();
      mount.current = null;
    };
  }, []);

  const setSpeed = (speed: number) => {
    if (!reduceRef.current) mount.current?.setSpeed?.(speed);
  };

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    setSpeed(BURST);
    window.setTimeout(() => setSpeed(hoveredRef.current ? HOVER : IDLE), 300);
    const rect = e.currentTarget.getBoundingClientRect();
    const ripple = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: rippleId.current++ };
    setRipples((prev) => [...prev, ripple]);
    window.setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)), 600);
    onClick?.();
  };

  const handlers = {
    onClick: handleClick,
    onMouseEnter: () => {
      hoveredRef.current = true;
      setHovered(true);
      setSpeed(HOVER);
    },
    onMouseLeave: () => {
      hoveredRef.current = false;
      setHovered(false);
      setPressed(false);
      setSpeed(IDLE);
    },
    onMouseDown: () => setPressed(true),
    onMouseUp: () => setPressed(false),
  };

  const classes = cn(
    "group relative isolate inline-flex h-12 select-none items-center justify-center rounded-full outline-none transition-[transform,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    pressed ? "translate-y-px scale-[0.98]" : "",
    pressed
      ? "shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_1px_2px_rgba(0,0,0,0.3)]"
      : hovered
        ? "shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_12px_6px_rgba(0,0,0,0.05),0_8px_5px_rgba(0,0,0,0.1),0_4px_4px_rgba(0,0,0,0.15),0_1px_2px_rgba(0,0,0,0.2)]"
        : "shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_20px_12px_rgba(0,0,0,0.06),0_9px_9px_rgba(0,0,0,0.1),0_2px_5px_rgba(0,0,0,0.15)]",
    className
  );

  const body = (
    <>
      <span
        aria-hidden
        className="absolute inset-0 overflow-hidden rounded-full bg-[linear-gradient(135deg,#f4f4f5_0%,#71717a_30%,#e4e4e7_50%,#52525b_75%,#d4d4d8_100%)]"
      >
        <span ref={shaderRef} className="liquid-metal-shader absolute inset-0" />
      </span>
      <span
        aria-hidden
        className={cn(
          "absolute inset-[2px] rounded-full bg-[linear-gradient(180deg,#202020_0%,#000000_100%)] transition-shadow duration-150",
          pressed && "shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(0,0,0,0.3)]"
        )}
      />
      <span
        className={cn(
          "relative z-10 flex items-center gap-2 px-6 text-sm font-semibold text-zinc-100 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]",
          contentClassName
        )}
      >
        {icon}
        <span className="whitespace-nowrap">{label}</span>
        {trailing}
      </span>
      <span aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-full">
        {ripples.map((r) => (
          <span
            key={r.id}
            className="absolute h-5 w-5 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0)_70%)] [animation:liquid-metal-ripple_0.6s_ease-out]"
            style={{ left: r.x, top: r.y }}
          />
        ))}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} {...handlers}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} {...handlers}>
      {body}
    </button>
  );
}

export default LiquidMetalButton;
