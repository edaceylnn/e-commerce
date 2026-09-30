// New-password rules shown (and checked) in the password forms.
export const PASSWORD_REQUIREMENTS = [
  { test: (v: string) => v.length >= 8, label: "En az 8 karakter" },
  { test: (v: string) => /[A-ZÇĞİÖŞÜ]/.test(v), label: "Büyük harf" },
  { test: (v: string) => /[a-zçğıöşü]/.test(v), label: "Küçük harf" },
  { test: (v: string) => /[0-9]/.test(v), label: "Rakam" },
] as const;
