// N2D Brand Logo Component — renders the official uploaded Need2Done logo
export default function N2DLogo({ size = 'md' }) {
  const sizes = {
    sm: 'h-16 md:h-20', // 64px to 80px
    md: 'h-20 md:h-28', // 80px to 112px
    lg: 'h-24 md:h-32', // 96px to 128px
  };
  const hClass = sizes[size] || sizes.md;

  return (
    <div className="flex items-center select-none">
      <img
        src="/logo.png?v=2"
        onError={(e) => { e.target.src = '/logos/need2done_logo.png'; }}
        alt="Need2Done"
        className={`${hClass} w-auto object-contain drop-shadow-sm`}
      />
    </div>
  );
}
