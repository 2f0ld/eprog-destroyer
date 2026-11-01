/** Avatar text: "jane.doe@student.ethz.ch" -> "JD", "jdoe@ethz.ch" -> "JD" (first two letters). */
export function initials(email: string) {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]+/).filter(Boolean)
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase()
}
