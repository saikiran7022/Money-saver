import type { Rule } from '../types';

/** The fixed set of categories used for analysis. */
export const CATEGORIES = [
  'Income',
  'Transfers',
  'Groceries',
  'Dining',
  'Transport',
  'Housing',
  'Utilities',
  'Subscriptions',
  'Shopping',
  'Health',
  'Entertainment',
  'Travel',
  'Cash',
  'Fees',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Default keyword → category map. Keywords are matched case-insensitively as
 * substrings of the transaction description. Order matters only in that the
 * first matching keyword wins, so more specific terms should come first.
 */
const DEFAULT_KEYWORDS: Array<[string, Category]> = [
  // Income
  ['salary', 'Income'], ['payroll', 'Income'], ['paycheck', 'Income'],
  ['interest', 'Income'], ['dividend', 'Income'], ['refund', 'Income'],
  ['deposit', 'Income'], ['credit interest', 'Income'],
  // Transfers
  ['transfer', 'Transfers'], ['zelle', 'Transfers'], ['venmo', 'Transfers'],
  ['paypal', 'Transfers'], ['e-transfer', 'Transfers'], ['etransfer', 'Transfers'],
  // Groceries
  ['walmart', 'Groceries'], ['costco', 'Groceries'], ['kroger', 'Groceries'],
  ['safeway', 'Groceries'], ['aldi', 'Groceries'], ['trader joe', 'Groceries'],
  ['whole foods', 'Groceries'], ['grocery', 'Groceries'], ['supermarket', 'Groceries'],
  ['tesco', 'Groceries'], ['sainsbury', 'Groceries'], ['lidl', 'Groceries'],
  // Dining
  ['restaurant', 'Dining'], ['cafe', 'Dining'], ['coffee', 'Dining'],
  ['starbucks', 'Dining'], ['mcdonald', 'Dining'], ['burger', 'Dining'],
  ['pizza', 'Dining'], ['doordash', 'Dining'], ['uber eats', 'Dining'],
  ['grubhub', 'Dining'], ['deliveroo', 'Dining'], ['bar ', 'Dining'],
  // Transport
  ['uber', 'Transport'], ['lyft', 'Transport'], ['shell', 'Transport'],
  ['chevron', 'Transport'], ['exxon', 'Transport'], ['bp ', 'Transport'],
  ['fuel', 'Transport'], ['gas station', 'Transport'], ['parking', 'Transport'],
  ['transit', 'Transport'], ['metro', 'Transport'], ['train', 'Transport'],
  ['toll', 'Transport'],
  // Housing
  ['rent', 'Housing'], ['mortgage', 'Housing'], ['landlord', 'Housing'],
  ['hoa', 'Housing'], ['property', 'Housing'],
  // Utilities
  ['electric', 'Utilities'], ['water', 'Utilities'], ['gas bill', 'Utilities'],
  ['internet', 'Utilities'], ['comcast', 'Utilities'], ['verizon', 'Utilities'],
  ['at&t', 'Utilities'], ['t-mobile', 'Utilities'], ['phone', 'Utilities'],
  ['utility', 'Utilities'],
  // Subscriptions
  ['netflix', 'Subscriptions'], ['spotify', 'Subscriptions'], ['hulu', 'Subscriptions'],
  ['disney+', 'Subscriptions'], ['youtube premium', 'Subscriptions'],
  ['icloud', 'Subscriptions'], ['google storage', 'Subscriptions'],
  ['prime', 'Subscriptions'], ['adobe', 'Subscriptions'], ['gym', 'Subscriptions'],
  ['membership', 'Subscriptions'],
  // Shopping
  ['amazon', 'Shopping'], ['ebay', 'Shopping'], ['target', 'Shopping'],
  ['best buy', 'Shopping'], ['ikea', 'Shopping'], ['etsy', 'Shopping'],
  ['store', 'Shopping'],
  // Health
  ['pharmacy', 'Health'], ['cvs', 'Health'], ['walgreens', 'Health'],
  ['doctor', 'Health'], ['dental', 'Health'], ['clinic', 'Health'],
  ['hospital', 'Health'], ['insurance', 'Health'],
  // Entertainment
  ['cinema', 'Entertainment'], ['movie', 'Entertainment'], ['theater', 'Entertainment'],
  ['steam', 'Entertainment'], ['playstation', 'Entertainment'], ['xbox', 'Entertainment'],
  ['concert', 'Entertainment'],
  // Travel
  ['airline', 'Travel'], ['airlines', 'Travel'], ['hotel', 'Travel'],
  ['airbnb', 'Travel'], ['booking.com', 'Travel'], ['expedia', 'Travel'],
  ['flight', 'Travel'],
  // Cash
  ['atm', 'Cash'], ['cash withdrawal', 'Cash'], ['withdrawal', 'Cash'],
  // Fees
  ['fee', 'Fees'], ['charge', 'Fees'], ['overdraft', 'Fees'], ['service charge', 'Fees'],
];

/**
 * Choose a category for a transaction. User-defined rules take precedence
 * over the built-in keyword map; if nothing matches, positive amounts default
 * to Income and the rest to Other.
 */
export function categorize(description: string, amount: number, rules: Rule[]): Category | string {
  const desc = description.toLowerCase();

  for (const rule of rules) {
    if (rule.match && desc.includes(rule.match.toLowerCase())) return rule.category;
  }

  for (const [keyword, category] of DEFAULT_KEYWORDS) {
    if (desc.includes(keyword)) {
      // Don't tag money-in as an expense category by mistake.
      if (amount > 0 && category !== 'Income' && category !== 'Transfers') continue;
      return category;
    }
  }

  return amount > 0 ? 'Income' : 'Other';
}

/** Re-run categorization across a set of descriptions given the current rules. */
export function recategorizeAll<T extends { description: string; amount: number }>(
  items: T[],
  rules: Rule[],
): (T & { category: string })[] {
  return items.map((it) => ({ ...it, category: categorize(it.description, it.amount, rules) }));
}
