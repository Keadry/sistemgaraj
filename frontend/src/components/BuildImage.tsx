const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function BuildImage({
  imageUrl,
  className = '',
}: {
  imageUrl: string | null;
  className?: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`${API_URL}${imageUrl}`}
        alt="Sistem görseli"
        className={`w-full h-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`w-full h-full flex items-center justify-center ${className}`}
    >
      <svg
        width="88"
        height="88"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="14"
          y="6"
          width="36"
          height="52"
          rx="4"
          stroke="var(--color-hairline)"
          strokeWidth="2"
        />
        <rect
          x="20"
          y="12"
          width="24"
          height="14"
          rx="2"
          fill="var(--color-trace)"
          fillOpacity="0.12"
        />
        <rect
          x="20"
          y="12"
          width="24"
          height="14"
          rx="2"
          stroke="var(--color-trace)"
          strokeWidth="1.5"
        />
        <circle
          cx="32"
          cy="19"
          r="4"
          stroke="var(--color-trace)"
          strokeWidth="1.5"
        />
        <line
          x1="20"
          y1="32"
          x2="44"
          y2="32"
          stroke="var(--color-hairline)"
          strokeWidth="1.5"
        />
        <line
          x1="20"
          y1="37"
          x2="44"
          y2="37"
          stroke="var(--color-hairline)"
          strokeWidth="1.5"
        />
        <circle cx="24" cy="49" r="2.5" fill="var(--color-compatible)" />
        <line
          x1="30"
          y1="49"
          x2="42"
          y2="49"
          stroke="var(--color-hairline)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
