export default function GoldCrownCap({
  size = "medium",
  label = "Goldener Kronkorken",
}: {
  size?: "small" | "medium" | "large";
  label?: string;
}) {
  return (
    <span
      className={`gold-crown-cap gold-crown-cap-${size}`}
      role="img"
      aria-label={label}
    >
      <span className="gold-cap-ridges" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => (
          <i key={index} style={{ "--ridge": index } as React.CSSProperties} />
        ))}
      </span>
      <span className="gold-cap-face" aria-hidden="true">
        <span className="gold-cap-crown">♛</span>
        <span className="gold-cap-mark">SM</span>
      </span>
    </span>
  );
}
