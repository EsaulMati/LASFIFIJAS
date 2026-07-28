export const PASSWORD_MIN_LENGTH = 8;

export const passwordRequirements = [
  { key: "length", label: "Mínimo 8 caracteres", test: (value: string) => value.length >= PASSWORD_MIN_LENGTH },
  { key: "uppercase", label: "Una letra mayúscula", test: (value: string) => /[A-Z]/.test(value) },
  { key: "lowercase", label: "Una letra minúscula", test: (value: string) => /[a-z]/.test(value) },
  { key: "number", label: "Un número", test: (value: string) => /\d/.test(value) },
  { key: "symbol", label: "Un símbolo", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

export const passwordLevels = [
  { label: "Muy débil", color: "bg-red-500" },
  { label: "Débil", color: "bg-orange-500" },
  { label: "Aceptable", color: "bg-amber-400" },
  { label: "Fuerte", color: "bg-lime-400" },
  { label: "Muy fuerte", color: "bg-emerald-400" },
] as const;

export function getPasswordStrength(password: string) {
  const passed = passwordRequirements.map((requirement) => requirement.test(password));
  const score = passed.filter(Boolean).length;
  return { passed, score, level: passwordLevels[Math.max(0, score - 1)] };
}

export function isValidPassword(password: string) {
  return passwordRequirements.every((requirement) => requirement.test(password));
}
