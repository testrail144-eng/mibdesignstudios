export default function BrandLogo({ size = 56, className = "" }) {
  return (
    <img
      className={`brand-logo ${className}`.trim()}
      src="/mib-design-logo.jpg"
      alt="MIB Design Studios logo"
      width={size}
      height={size}
    />
  );
}
