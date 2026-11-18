import type { CSSProperties, HTMLAttributes } from "react";

export type PlayState = "running" | "paused";

/** Eight-petal animated spark. Extra span attributes pass through to the root. */
export interface SparkProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "color"> {
  /** Width and height in pixels. Defaults to 20. */
  size?: number;
  /** Any CSS color. Defaults to currentColor. */
  color?: string;
  /** Length of one loop in milliseconds. Defaults to 1400. */
  duration?: number;
  /** Pauses or resumes the animation. Defaults to running. */
  playState?: PlayState;
}

const DEFAULT_SIZE = 20;
const DEFAULT_DURATION = 1400;
const petals = Array.from({ length: 8 }, (_, i) => (i % 2 ? 3.54 : 5.66));

export default function Spark({
  size = DEFAULT_SIZE,
  color,
  duration,
  playState,
  className,
  style,
  ...rest
}: SparkProps) {
  return (
    <span
      aria-hidden="true"
      {...rest}
      className={["lsv-spark", className].filter(Boolean).join(" ")}
      style={
        {
          "--lsv-size": `${size}px`,
          "--_duration":
            duration === undefined
              ? `var(--lsv-duration, ${DEFAULT_DURATION}ms)`
              : `${duration}ms`,
          "--_play-state": playState ?? "var(--lsv-play-state, running)",
          color,
          ...style,
        } as CSSProperties
      }
    >
      <span className="lsv-spark-turn">
        {petals.map((length, i) => (
          <span
            className="lsv-spark-arm"
            key={i}
            style={{ "--i": i } as CSSProperties}
          >
            <span
              className="lsv-spark-petal"
              style={{ "--length": length } as CSSProperties}
            />
          </span>
        ))}
      </span>
    </span>
  );
}
