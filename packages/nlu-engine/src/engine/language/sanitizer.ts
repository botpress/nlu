const StripSpecialChars = (txt: string) => txt.replace(/[&\/\\#,+()$!^~%.'":*?<>{}\u2581]/g, '').trim()

export const sanitize = (text: string): string => {
  return StripSpecialChars(text)
}
