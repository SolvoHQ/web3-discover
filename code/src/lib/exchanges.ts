export interface Exchange {
  name: string;
  url: string;
  note: string;
}

export const SELL_EXCHANGES: Exchange[] = [
  {
    name: 'Binance',
    url: 'https://www.binance.com/en/trade',
    note: 'deepest liquidity, most pairs',
  },
  {
    name: 'OKX',
    url: 'https://www.okx.com/trade-spot',
    note: 'strong derivatives, broad altcoin coverage',
  },
  {
    name: 'MEXC',
    url: 'https://www.mexc.com/exchange',
    note: 'lists newer tokens earliest',
  },
  {
    name: 'Bybit',
    url: 'https://www.bybit.com/en/trade/spot',
    note: 'good fills on mid-cap pairs',
  },
];
