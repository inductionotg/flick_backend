

const MAX_PROMPT_EXTRA_LENGTH = 400;

const BLOCKLIST = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(the\s+)?(system|above)/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /\bSYSTEM\s*:/i,
  /\bADMIN\s*:/i,
  /\[INST\]/i,
  /<\s*script/i,
];

function stripUnsafeChars(input) {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}


function sanitizePromptExtra(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true, value: '' };
  }

  if (typeof raw !== 'string') {
    return { ok: false, error: 'promptExtra must be text.' };
  }

  let s = stripUnsafeChars(raw);
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  s = s.trim();
  if (s === '') {
    return { ok: true, value: '' };
  }

  if (s.length > MAX_PROMPT_EXTRA_LENGTH) {
    return {
      ok: false,
      error: `promptExtra is too long (max ${MAX_PROMPT_EXTRA_LENGTH} characters).`,
    };
  }

  for (const pattern of BLOCKLIST) {
    if (pattern.test(s)) {
      return {
        ok: false,
        error: 'That text cannot be used. Please describe visual details only.',
      };
    }
  }

  s = s.replace(/[<>]/g, ' ');
  s = s.replace(/[ \t\u00A0]+/g, ' ');
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.trim();

  if (s.length > MAX_PROMPT_EXTRA_LENGTH) {
    return {
      ok: false,
      error: `promptExtra is too long (max ${MAX_PROMPT_EXTRA_LENGTH} characters).`,
    };
  }

  return { ok: true, value: s };
}

module.exports = {
  sanitizePromptExtra,
  MAX_PROMPT_EXTRA_LENGTH,
};
