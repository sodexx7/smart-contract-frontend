/**
 * Formats a balance string to a human-readable format
 */
export function formatBalance(balance: string, decimals: number = 2): string {
  const num = parseFloat(balance);
  
  if (isNaN(num)) return '0.00';
  
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  } else {
    return num.toFixed(decimals);
  }
}

/**
 * Formats a token balance with the token symbol
 */
export function formatTokenBalance(balance: string, symbol: string, decimals: number = 2): string {
  return `${formatBalance(balance, decimals)} ${symbol}`;
}