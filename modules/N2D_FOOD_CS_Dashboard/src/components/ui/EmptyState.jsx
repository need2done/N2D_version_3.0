export default function EmptyState({ icon = '🍽️', title = 'Nothing here yet', subtitle = '', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="font-display text-xl font-semibold text-text-primary mb-2">{title}</h3>
      {subtitle && <p className="text-text-secondary text-sm mb-6 max-w-xs">{subtitle}</p>}
      {action && (
        <button onClick={action.onClick} className="btn-primary">
          {action.label}
        </button>
      )}
    </div>
  );
}
