import "server-only"

export const maskCourierRecipient = (recipient: string): string => {
  const at = recipient.indexOf("@")
  if (at > 0) return `${recipient[0]}***${recipient.slice(at)}`
  if (recipient.startsWith("+") && recipient.length > 3) {
    return `+${"*".repeat(recipient.length - 3)}${recipient.slice(-2)}`
  }
  return recipient ? `${recipient[0]}***` : "***"
}
