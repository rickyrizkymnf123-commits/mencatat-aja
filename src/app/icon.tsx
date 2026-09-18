import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #04060d 0%, #0c1827 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          border: '1.5px solid rgba(16, 185, 129, 0.8)',
          boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          M
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
