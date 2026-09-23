interface DefaultAvatarProps {
  initials?: string;
  size?: number;
  variant?: 'blue' | 'marine';
}

export default function DefaultAvatar({
  initials = '',
  size = 64,
  variant = 'marine',
}: DefaultAvatarProps) {
  const bg    = variant === 'marine' ? '#0C1B3E' : '#1D4ED8';
  const color = variant === 'marine' ? '#D4AF5A' : '#ffffff';
  const text  = initials.slice(0, 2).toUpperCase();
  const fontSize = text.length > 1 ? Math.round(size * 0.31) : Math.round(size * 0.38);

  // SVG encodé en data URI — immunisé contre tout conflit CSS/button
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${bg}"/>
    ${text
      ? `<text x="${size/2}" y="${size/2}" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" font-weight="700" font-family="Georgia, serif" fill="${color}" letter-spacing="1">${text}</text>`
      : `<circle cx="${size/2}" cy="${size*0.38}" r="${size*0.18}" fill="rgba(255,255,255,0.8)"/>
         <path d="M${size*0.15} ${size*0.92} Q${size*0.15} ${size*0.62} ${size/2} ${size*0.62} Q${size*0.85} ${size*0.62} ${size*0.85} ${size*0.92}" fill="rgba(255,255,255,0.6)"/>`
    }
  </svg>`;

  const src = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  return (
    <img
      src={src}
      alt={text || 'Avatar'}
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}
      draggable={false}
    />
  );
}
