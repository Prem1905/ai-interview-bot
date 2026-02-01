export function validateMessage(body: any) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request' };
  }
  const { message } = body;
  if (typeof message !== 'string') {
    return { ok: false, error: 'Message must be a string' };
  }
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: 'Message cannot be empty' };
  }
  if (trimmed.length > 300) {
    return { ok: false, error: 'Message too long (max 300 characters)' };
  }
  // Basic sanitize - remove suspicious system-like tokens
  const suspicious = /<\/?system>|\bSYSTEM_PROMPT\b|--system|#system/gi;
  if (suspicious.test(trimmed)) {
    return { ok: false, error: 'Invalid content in message' };
  }
  return { ok: true, message: trimmed };
}
