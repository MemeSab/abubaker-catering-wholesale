// Exchange Rate service for Bespoke Inventory System

const CACHE_KEY = 'bespoke_exchange_rates';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour caching

// Default fallback rates (Base -> Target)
const FALLBACK_RATES = {
  GBP: { CNY: 9.15, TRY: 40.50, USD: 1.27, EUR: 1.17, GBP: 1.0 },
  USD: { CNY: 7.24, TRY: 32.25, USD: 1.0, EUR: 0.92, GBP: 0.79 },
  EUR: { CNY: 7.84, TRY: 34.85, USD: 1.09, EUR: 1.0, GBP: 0.85 },
};

/**
 * Fetches real-time exchange rates for the given base currency.
 * @param {string} baseCurrency - e.g., 'GBP', 'USD', 'EUR'
 * @returns {Promise<object>} Rates object and metadata
 */
export async function fetchLiveRates(baseCurrency = 'GBP') {
  const cached = getCachedRates(baseCurrency);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates for ${baseCurrency}`);
    }
    const data = await response.ok ? await response.json() : null;
    
    if (data && data.result === 'success') {
      const ratesResult = {
        base: baseCurrency,
        rates: {
          CNY: data.rates.CNY || FALLBACK_RATES[baseCurrency].CNY,
          TRY: data.rates.TRY || FALLBACK_RATES[baseCurrency].TRY,
          USD: data.rates.USD || FALLBACK_RATES[baseCurrency].USD,
          EUR: data.rates.EUR || FALLBACK_RATES[baseCurrency].EUR,
          GBP: data.rates.GBP || FALLBACK_RATES[baseCurrency].GBP,
        },
        updatedAt: new Date().toISOString(),
        source: 'Live (open.er-api.com)'
      };
      
      saveToCache(baseCurrency, ratesResult);
      return ratesResult;
    }
  } catch (error) {
    console.error('Error fetching live rates, using fallback:', error);
  }

  // Return fallback rates
  return {
    base: baseCurrency,
    rates: FALLBACK_RATES[baseCurrency] || FALLBACK_RATES.GBP,
    updatedAt: new Date().toISOString(),
    source: 'Fallback Rates (Offline)'
  };
}

function getCachedRates(baseCurrency) {
  try {
    const cachedData = localStorage.getItem(`${CACHE_KEY}_${baseCurrency}`);
    if (!cachedData) return null;

    const parsed = JSON.parse(cachedData);
    const age = Date.now() - new Date(parsed.updatedAt).getTime();
    
    if (age < CACHE_DURATION_MS) {
      return parsed;
    }
  } catch (e) {
    console.error('Error reading rates cache', e);
  }
  return null;
}

function saveToCache(baseCurrency, data) {
  try {
    localStorage.setItem(`${CACHE_KEY}_${baseCurrency}`, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving rates cache', e);
  }
}

/**
 * Gets custom rates overrides from localStorage
 */
export function getCustomRates() {
  try {
    const custom = localStorage.getItem('bespoke_custom_rates_override');
    return custom ? JSON.parse(custom) : {};
  } catch (e) {
    return {};
  }
}

/**
 * Saves custom rates overrides to localStorage
 */
export function saveCustomRates(overrides) {
  try {
    localStorage.setItem('bespoke_custom_rates_override', JSON.stringify(overrides));
  } catch (e) {
    console.error('Error saving custom rates', e);
  }
}
