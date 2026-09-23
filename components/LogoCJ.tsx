// Logo Cabinet Juridique — monogramme CJ dans un losange doré
// Props: variant ('light' | 'dark' | 'auto'), size (px)

interface LogoCJProps {
  variant?: 'light' | 'dark' | 'auto';
  size?: number;
  className?: string;
}

export default function LogoCJ({ variant = 'dark', size = 48, className = '' }: LogoCJProps) {
  const textFill = variant === 'dark' ? '#F6F4F0' : '#0C1B3E';
  const bg = variant === 'dark' ? '#0C1B3E' : 'transparent';

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Cabinet Juridique"
    >
      {variant === 'dark' && (
        <rect width="64" height="64" fill={bg} rx="12" />
      )}
      {/* Losange extérieur */}
      <polygon
        points="32,4 60,32 32,60 4,32"
        fill="none"
        stroke="#B8963E"
        strokeWidth="1.2"
      />
      {/* Losange intérieur fin */}
      <polygon
        points="32,13 51,32 32,51 13,32"
        fill="none"
        stroke="#B8963E"
        strokeWidth="0.5"
        opacity="0.5"
      />
      {/* Monogramme */}
      <text
        x="32"
        y="42"
        fontFamily="Cormorant Garamond, Georgia, serif"
        fontSize="28"
        fontWeight="300"
        fill={textFill}
        textAnchor="middle"
        letterSpacing="-0.5"
      >
        CJ
      </text>
      {/* Filet doré */}
      <line x1="18" y1="45" x2="46" y2="45" stroke="#B8963E" strokeWidth="0.6" />
    </svg>
  );
}
