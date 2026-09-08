export type ParsedTransaction = {
  date: Date;
  description: string;
  amount: number;
};

export type ParseResult = {
  transactions: ParsedTransaction[];
  warnings: string[];
};
