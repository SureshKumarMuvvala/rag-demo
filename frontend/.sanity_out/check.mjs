import { calculateCosts, formatCurrency, formatNumber } from './costs.js';

const cases = [
  { documents: 100_000, monthlyQueries: 100_000, model: 'mid', vectorDb: 'managed', teamSize: 2 },
  { documents: 100_000, monthlyQueries: 100_000, model: 'frontier', vectorDb: 'managed', teamSize: 2 },
  { documents: 100_000, monthlyQueries: 100_000, model: 'open', vectorDb: 'selfhosted', teamSize: 4 },
];

for (const inputs of cases) {
  const c = calculateCosts(inputs);
  console.log('---');
  console.log('inputs:', inputs);
  console.log('total:', formatCurrency(c.total), 'annual:', formatCurrency(c.annual));
  console.log('buckets:', Object.entries(c).filter(([k]) => k !== 'total' && k !== 'annual').map(([k, v]) => `${k}=${formatCurrency(v)}`).join(', '));
}

console.log('formatCurrency(12500):', formatCurrency(12500));
console.log('formatNumber(1_200_000):', formatNumber(1_200_000));
