import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 110,
          background: "linear-gradient(145deg, #7a523c 0%, #5c3d2e 45%, #3d2820 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff9f0",
          borderRadius: 40,
          boxShadow: "inset 0 2px 0 rgba(255,255,255,0.15)",
        }}
      >
        ♪
      </div>
    ),
    { ...size },
  );
}
