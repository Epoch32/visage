export interface RegionOption {
  id: string;
  name: string;
  location: string;
  flag: string;
  compliance: string;
}

export const REGIONS: RegionOption[] = [
  {
    id: "us-east",
    name: "US East (N. Virginia)",
    location: "iad-01",
    flag: "US",
    compliance: "FedRAMP High"
  },
  {
    id: "eu-central",
    name: "EU Central (Frankfurt)",
    location: "fra-01",
    flag: "EU",
    compliance: "GDPR / C5"
  },
  {
    id: "ap-southeast",
    name: "AP Southeast (Singapore)",
    location: "sin-01",
    flag: "SG",
    compliance: "MAS TRM"
  }
];

export interface PasswordScore {
  score: number;
  label: "weak" | "medium" | "strong" | "enterprise";
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function evaluatePassword(pwd: string): PasswordScore {
  if (!pwd) {
    return {
      score: 0,
      label: "weak",
      hasUpper: false,
      hasLower: false,
      hasNumber: false,
      hasSpecial: false
    };
  }

  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  let score = 0;
  if (pwd.length >= 8) score++;
  if (hasUpper && hasLower) score++;
  if (hasNumber) score++;
  if (hasSpecial && pwd.length >= 12) score++;

  let label: PasswordScore["label"] = "weak";
  if (score === 2) label = "medium";
  else if (score === 3) label = "strong";
  else if (score >= 4) label = "enterprise";

  return { score, label, hasUpper, hasLower, hasNumber, hasSpecial };
}
