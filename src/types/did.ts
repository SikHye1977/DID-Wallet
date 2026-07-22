// src/types/did.ts
export interface DidData {
  did: string;
  edVerkey: string;
  edSecretkey: string;
  xVerkey: string;
  xSecretkey: string;
  createdAt: number;
  alias?: string;
  isRegistered?: boolean;
}
