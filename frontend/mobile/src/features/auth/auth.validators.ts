const FULL_NAME_ALLOWED_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/;

export function sanitizeFullNameInput(value: string) {
  return value
    .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, '')
    .replace(/\s{2,}/g, ' ');
}

export function normalizeFullName(value: string) {
  return sanitizeFullNameInput(value).trim().replace(/\s+/g, ' ');
}

export function isValidFullName(value: string) {
  return FULL_NAME_ALLOWED_REGEX.test(value);
}

export function hasNameAndLastName(value: string) {
  return value.trim().split(/\s+/).length >= 2;
}