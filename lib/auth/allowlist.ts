/**
 * Who may use the dashboard.
 *
 * Supabase Auth on this project accepts public sign-ups, so "has a valid
 * session" is not enough: anyone could create an account with the public
 * anon key. Access is limited to the emails listed in ALLOWED_EMAILS
 * (comma-separated), falling back to the owner's address.
 */
const DEFAULT_ALLOWED_EMAILS = ['canayar@manuelsolis.com']

export function allowedEmails(): string[] {
  const raw = process.env.ALLOWED_EMAILS
  const list = raw && raw.trim() ? raw.split(',') : DEFAULT_ALLOWED_EMAILS
  return list.map(e => e.trim().toLowerCase()).filter(Boolean)
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return allowedEmails().includes(email.trim().toLowerCase())
}
