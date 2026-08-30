import type { SearchResult } from '../../../shared/types';

// A local list of liquid NEPSE symbols for offline autocomplete. NEPSE isn't in
// Yahoo's search, and merolagani has no clean search endpoint, so this ships
// with the app. Typing an unlisted symbol still works — it goes straight to the
// data feed.
const NEPSE: Array<[symbol: string, name: string]> = [
  ['NABIL', 'Nabil Bank'],
  ['NICA', 'NIC Asia Bank'],
  ['SCB', 'Standard Chartered Bank Nepal'],
  ['EBL', 'Everest Bank'],
  ['HBL', 'Himalayan Bank'],
  ['SBI', 'Nepal SBI Bank'],
  ['SBL', 'Siddhartha Bank'],
  ['PRVU', 'Prabhu Bank'],
  ['KBL', 'Kumari Bank'],
  ['MBL', 'Machhapuchchhre Bank'],
  ['NMB', 'NMB Bank'],
  ['GBIME', 'Global IME Bank'],
  ['ADBL', 'Agricultural Development Bank'],
  ['CZBIL', 'Citizens Bank International'],
  ['LSL', 'Laxmi Sunrise Bank'],
  ['NRIC', 'Nepal Reinsurance Company'],
  ['HRL', 'Himalayan Reinsurance'],
  ['NLIC', 'Nepal Life Insurance'],
  ['NLICL', 'National Life Insurance'],
  ['LICN', 'Life Insurance Corporation Nepal'],
  ['HDL', 'Himalayan Distillery'],
  ['SHIVM', 'Shivam Cements'],
  ['GCIL', 'Ghorahi Cement'],
  ['UNL', 'Unilever Nepal'],
  ['BNL', 'Bottlers Nepal'],
  ['NTC', 'Nepal Telecom'],
  ['UPPER', 'Upper Tamakoshi Hydropower'],
  ['API', 'Api Power Company'],
  ['CHCL', 'Chilime Hydropower'],
  ['BPCL', 'Butwal Power Company'],
  ['NHPC', 'National Hydro Power Company'],
  ['UPCL', 'Universal Power Company'],
  ['SHPC', 'Sanjen Jalvidhyut'],
  ['RHPL', 'Ridi Hydropower'],
  ['DHPL', 'Dibyaswari Hydropower'],
  ['NIFRA', 'Nepal Infrastructure Bank'],
  ['NRN', 'NRN Infrastructure and Development'],
  ['CIT', 'Citizen Investment Trust'],
  ['HIDCL', 'Hydroelectricity Investment & Development'],
  ['SONA', 'Sona Hydropower'],
];

const AS_RESULTS: SearchResult[] = NEPSE.map(([symbol, name]) => ({
  symbol,
  name,
  exchange: 'NEPSE',
  market: 'nepse',
  type: 'equity',
}));

/**
 * Company name for a NEPSE symbol, or null. merolagani's chart feed carries no
 * name, so without this the brief header reads "NABIL · 1d" while every Yahoo
 * market shows the company.
 */
export function nepseName(symbol: string): string | null {
  const s = symbol.trim().toUpperCase();
  return NEPSE.find(([sym]) => sym === s)?.[1] ?? null;
}

export function searchNepseLocal(query: string): SearchResult[] {
  const q = query.trim().toUpperCase();
  if (q.length < 1) return AS_RESULTS.slice(0, 8);
  return AS_RESULTS.filter(
    (r) => r.symbol.startsWith(q) || r.name.toUpperCase().includes(q),
  ).slice(0, 8);
}
