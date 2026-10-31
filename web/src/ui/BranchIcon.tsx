/** Git branch icon drawn in the IntelliJ expUI style (the original lives in the Git plugin, not the platform icon set). */
export function BranchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="ij-svg-icon">
      <circle cx="4.5" cy="3.5" r="1.5" stroke="currentColor" />
      <circle cx="4.5" cy="12.5" r="1.5" stroke="currentColor" />
      <circle cx="11.5" cy="5.5" r="1.5" stroke="currentColor" />
      <path d="M4.5 5V11M11.5 7C11.5 9.5 4.5 8.5 4.5 11" stroke="currentColor" />
    </svg>
  )
}
