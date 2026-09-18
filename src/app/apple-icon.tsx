import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #04060d 0%, #0c1827 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
          border: '4px solid rgba(16, 185, 129, 0.8)',
          boxShadow: '0 0 30px rgba(16, 185, 129, 0.5)',
        }}
      >
        <div
          style={{
            fontSize: 90,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          M
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#f59e0b',
            letterSpacing: 2,
            marginTop: -8,
          }}
        >
          AI WEALTH
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
