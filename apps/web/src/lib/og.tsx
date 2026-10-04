import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const ACCENT = "#ff822e";
const ACCENT_STRONG = "#c2530a";

const publicDir = path.join(process.cwd(), "public");
const fontDir = path.join(process.cwd(), "src/assets/fonts");

async function dataUri(file: string, mime: string): Promise<string> {
  const buf = await readFile(path.join(publicDir, file));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function fonts() {
  const [bold, semi] = await Promise.all([
    readFile(path.join(fontDir, "Montserrat-Bold.ttf")),
    readFile(path.join(fontDir, "Montserrat-SemiBold.ttf")),
  ]);
  return [
    { name: "Montserrat", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Montserrat", data: semi, weight: 600 as const, style: "normal" as const },
  ];
}

/**
 * Shared 1200x630 share card: copy on the left, a product screenshot bleeding off the right edge.
 * `screenshot` is a path under /public; remote product images can be passed as `imageUrl`.
 */
export async function renderOgCard({
  eyebrow,
  title,
  subtitle,
  screenshot,
  imageUrl,
  footer = "shopmi.ng",
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  screenshot?: string;
  imageUrl?: string | null;
  footer?: string;
}) {
  const [logo, shot, fontData] = await Promise.all([
    dataUri("brand/logo-light.png", "image/png"),
    screenshot ? dataUri(screenshot, "image/jpeg") : Promise.resolve(imageUrl ?? null),
    fonts(),
  ]);
  const isPhoto = !screenshot && !!imageUrl;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#fbf7f2",
          fontFamily: "Montserrat",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -180,
            bottom: -260,
            width: 760,
            height: 760,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${ACCENT}55 0%, ${ACCENT}00 70%)`,
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: shot ? 600 : 1072,
            padding: "56px 0 52px 64px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={200} height={50} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "8px 16px",
                borderRadius: 9999,
                background: "#ffffff",
                border: "1px solid #ece4da",
                color: ACCENT_STRONG,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {eyebrow}
            </div>
            <div
              style={{
                marginTop: 24,
                fontSize: title.length > 40 ? 50 : 60,
                fontWeight: 700,
                lineHeight: 1.06,
                letterSpacing: -1.5,
                color: "#141414",
              }}
            >
              {title}
            </div>
            <div
              style={{
                marginTop: 20,
                fontSize: 25,
                fontWeight: 600,
                lineHeight: 1.35,
                color: "#57534e",
              }}
            >
              {subtitle}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 20, fontWeight: 600, color: "#78716c" }}>
            <div style={{ width: 10, height: 10, borderRadius: 9999, background: ACCENT, marginRight: 10 }} />
            {footer}
          </div>
        </div>
        {shot ? (
          <div
            style={{
              position: "absolute",
              left: isPhoto ? 680 : 650,
              top: isPhoto ? 70 : 96,
              width: isPhoto ? 460 : 720,
              height: isPhoto ? 490 : 470,
              display: "flex",
              borderRadius: 20,
              overflow: "hidden",
              border: "1px solid #e7e0d6",
              boxShadow: "0 30px 60px -20px rgba(60, 40, 20, 0.35)",
              background: "#ffffff",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shot}
              alt=""
              width={isPhoto ? 460 : 720}
              height={isPhoto ? 490 : 470}
              style={{ objectFit: "cover", objectPosition: isPhoto ? "center" : "left top" }}
            />
          </div>
        ) : null}
      </div>
    ),
    { ...OG_SIZE, fonts: fontData }
  );
}
