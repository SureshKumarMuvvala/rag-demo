// Pure, synchronous cost-model implementation.
// All formulas come from the RAG TCO Estimator spec.
import { RATES } from './rates';
/**
 * Compute the monthly cost breakdown for a given set of inputs.
 *
 * Bucket order (matches the spec and `CostBreakdown`):
 *   1. inference   - LLM generation cost (or GPU step cost for 'open')
 *   2. vector      - Vector DB hosting
 *   3. embed       - One-time embedding + parse cost, amortized monthly
 *   4. reindex     - Monthly re-embedding of the churn fraction of the corpus
 *   5. infra       - Baseline infra + per-million-query charge
 *   6. obs         - Baseline observability + 5% of inference
 *   7. labor       - teamSize * laborMonthly * maintenance fraction
 */
export function calculateCosts(inputs) {
    const { documents, monthlyQueries, model, vectorDb, teamSize } = inputs;
    // 1. inference
    let inference;
    if (model === 'open') {
        inference =
            Math.ceil(monthlyQueries / RATES.models.open.gpuCapacity) *
                RATES.models.open.gpuStep;
    }
    else {
        const m = RATES.models[model];
        inference =
            monthlyQueries *
                (((RATES.retrievedTokens + RATES.promptTokens) / 1000000) * m.in +
                    (RATES.outputTokens / 1000000) * m.out);
    }
    // 2. vector
    const db = RATES.dbs[vectorDb];
    const vector = db.base +
        ((documents * RATES.avgPagesPerDoc * RATES.chunkPerPage) / 1000000) *
            db.perMvec;
    // 3. embed (amortized one-time cost spread over `months`)
    const pages = documents * RATES.avgPagesPerDoc;
    const embed = ((pages * RATES.tokensPerPage) / 1000000 * RATES.embedPricePerM +
        pages * RATES.parsePerPage) /
        RATES.months;
    // 4. reindex (same shape as embed, but on the monthly churn fraction)
    const churnPages = pages * RATES.churnPerMonth;
    const reindex = ((churnPages * RATES.tokensPerPage) / 1000000 * RATES.embedPricePerM +
        churnPages * RATES.parsePerPage) /
        RATES.months;
    // 5. infra
    const infra = RATES.infraBase + (monthlyQueries / 1000000) * 40;
    // 6. obs
    const obs = RATES.obsBase + inference * 0.05;
    // 7. labor
    const labor = teamSize * RATES.laborMonthly * RATES.maintFrac[vectorDb];
    const total = inference + vector + embed + reindex + infra + obs + labor;
    const annual = total * RATES.months;
    return {
        inference,
        vector,
        embed,
        reindex,
        infra,
        obs,
        labor,
        total,
        annual,
    };
}
/**
 * Format a number as a compact USD string.
 * Examples: 42 -> "$42", 1240 -> "$1,240", 12500 -> "$12.5k",
 *           1_200_000 -> "$1.2M", 1_500_000_000 -> "$1.5B".
 */
export function formatCurrency(n) {
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    if (abs < 1000) {
        return `${sign}$${stripTrailingZeros(abs.toFixed(2))}`;
    }
    if (abs < 10000) {
        return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
    }
    if (abs < 1000000) {
        return `${sign}$${compactValue(abs, 1000, 'k')}`;
    }
    if (abs < 1000000000) {
        return `${sign}$${compactValue(abs, 1000000, 'M')}`;
    }
    return `${sign}$${compactValue(abs, 1000000000, 'B')}`;
}
/**
 * Format a number as a compact numeric string (no currency symbol).
 * Examples: 42 -> "42", 1240 -> "1,240", 100_000 -> "100k",
 *           1_200_000 -> "1.2M", 1_500_000_000 -> "1.5B".
 */
export function formatNumber(n) {
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    if (abs < 1000) {
        return `${sign}${stripTrailingZeros(abs.toFixed(2))}`;
    }
    if (abs < 10000) {
        return `${sign}${Math.round(abs).toLocaleString('en-US')}`;
    }
    if (abs < 1000000) {
        return `${sign}${compactValue(abs, 1000, 'k')}`;
    }
    if (abs < 1000000000) {
        return `${sign}${compactValue(abs, 1000000, 'M')}`;
    }
    return `${sign}${compactValue(abs, 1000000000, 'B')}`;
}
function compactValue(value, divisor, suffix) {
    const s = (value / divisor).toFixed(1);
    // Drop the ".0" we always add, but keep other decimals like ".5".
    return s.endsWith('.0') ? `${s.slice(0, -2)}${suffix}` : `${s}${suffix}`;
}
function stripTrailingZeros(s) {
    // "1.20" -> "1.2", "1.00" -> "1", "0.50" -> "0.5".
    if (!s.includes('.'))
        return s;
    return s.replace(/\.?0+$/, '');
}
