
const Loader = ({
  fullScreen = true,
  message = "Loading...",
  subtitle = null,
  size = "medium",
  overlay = true
}) => {
  const sizeClasses = {
    small: "w-6 h-6",
    medium: "w-8 h-8",
    large: "w-12 h-12"
  }

  const containerClasses = fullScreen
    ? "fixed inset-0 flex items-center justify-center font-ui"
    : "flex items-center justify-center p-8 font-ui"

  const overlayClasses = overlay && fullScreen
    ? "bg-[var(--text-color-ink)] bg-opacity-50"
    : ""

  return (
    <div className={`${containerClasses} ${overlayClasses}`}>
      <div className="flex flex-col items-center space-y-4">
        <div className={`${sizeClasses[size]} border-4 border-[var(--border-color-line)] border-t-[var(--primary-color-royal)] rounded-full animate-spin`}></div>
        <div className="text-center">
          <p className={`${fullScreen ? 'text-[var(--color-white)]' : 'text-[var(--text-color-ink)]'} font-medium`}>
            {message}
          </p>
          {subtitle && (
            <p className={`${fullScreen ? 'text-[var(--text-color-ink-400)]' : 'text-[var(--text-color-ink-400)]'} text-sm mt-1`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Loader
