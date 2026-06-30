// Cost model constants. Values are fixed by the spec; do not edit without
// updating the spec and the downstream components that reference them.
export const RATES = {
    avgPagesPerDoc: 12,
    tokensPerPage: 500,
    embedPricePerM: 0.02,
    parsePerPage: 0.0012,
    retrievedTokens: 2200,
    promptTokens: 500,
    outputTokens: 450,
    chunkPerPage: 1.2,
    laborMonthly: 14000,
    churnPerMonth: 0.08,
    months: 12,
    obsBase: 120,
    infraBase: 55,
    models: {
        frontier: { in: 3.0, out: 15.0 },
        mid: { in: 0.5, out: 1.5 },
        open: { gpuStep: 1500, gpuCapacity: 500000 },
    },
    dbs: {
        managed: { base: 70, perMvec: 55 },
        selfhosted: { base: 210, perMvec: 6 },
    },
    maintFrac: {
        managed: 0.22,
        selfhosted: 0.6,
    },
};
