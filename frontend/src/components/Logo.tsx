export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width="26"
        height="26"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="7"
          y="7"
          width="14"
          height="14"
          rx="3"
          stroke="var(--color-trace)"
          strokeWidth="2"
        />
        <rect
          x="11"
          y="11"
          width="6"
          height="6"
          rx="1"
          fill="var(--color-trace)"
        />
        <path
          d="M14 2V6M14 22V26M2 14H6M22 14H26M5 5L7.5 7.5M22.5 7.5L20 5M5 23L7.5 20.5M22.5 20.5L20 23"
          stroke="var(--color-trace)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
        Sistem<span className="text-trace">Garaj</span>
      </span>
    </div>
  );
}
