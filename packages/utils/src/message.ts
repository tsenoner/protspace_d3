export function sanitizeForMessage(input: unknown, maxLength = 64): string {
  const stringified = String(input ?? "");
  const withoutControls = stringified.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  const singleLine = withoutControls.replace(/[\r\n]+/g, " ").trim();
  if (singleLine.length === 0) {
    return "<unknown>";
  }
  if (singleLine.length > maxLength) {
    return singleLine.slice(0, maxLength) + "…";
  }
  return singleLine;
}


