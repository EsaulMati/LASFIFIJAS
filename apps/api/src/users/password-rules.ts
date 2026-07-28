export const PASSWORD_MIN_LENGTH = 8;

export const passwordPatterns = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  symbol: /[^A-Za-z0-9]/,
} as const;
