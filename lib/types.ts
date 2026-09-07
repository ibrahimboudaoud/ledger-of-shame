export interface PersonLite {
  id: string;
  name: string;
}

export interface RawDebtLite {
  fromId: string;
  toId: string;
  amountCents: number;
}

export interface SettlementLite {
  from: string;
  to: string;
  amountCents: number;
}
