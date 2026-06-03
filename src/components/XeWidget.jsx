import React, { useState, useEffect } from 'react';
import { RefreshCw, DollarSign, Edit3, Check, Globe } from 'lucide-react';

export default function XeWidget({
  nativeCurrency,
  liveRates,
  customRates,
  onUpdateCustomRates,
  onRefreshLive,
  isRefreshing
}) {
  const [converterAmount, setConverterAmount] = useState('1000');
  const [converterFrom, setConverterFrom] = useState('GBP');
  const [converterTo, setConverterTo] = useState('CNY');
  const [editCurrency, setEditCurrency] = useState(null); // 'CNY' or 'TRY' or null
  const [editValue, setEditValue] = useState('');

  // Auto-adjust converter base when native currency changes
  useEffect(() => {
    setConverterFrom(nativeCurrency);
  }, [nativeCurrency]);

  const activeRates = {
    CNY: customRates.CNY || (liveRates.rates && liveRates.rates.CNY) || 9.15,
    TRY: customRates.TRY || (liveRates.rates && liveRates.rates.TRY) || 40.50,
    USD: liveRates.rates ? liveRates.rates.USD : 1.27,
    EUR: liveRates.rates ? liveRates.rates.EUR : 1.17,
    GBP: liveRates.rates ? liveRates.rates.GBP : 1.0,
  };

  // Safe converter calculation
  const handleConvert = () => {
    const amt = parseFloat(converterAmount) || 0;
    if (amt === 0) return '0.00';

    let amountInBase = amt;
    if (converterFrom !== nativeCurrency) {
      // If converting from a foreign currency, convert to native first
      const rateFromBaseToSource = activeRates[converterFrom] || 1;
      amountInBase = amt / rateFromBaseToSource;
    }

    const rateFromBaseToTarget = activeRates[converterTo] || 1;
    const result = amountInBase * rateFromBaseToTarget;
    
    return result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const startEditing = (curr, currentVal) => {
    setEditCurrency(curr);
    setEditValue(currentVal.toString());
  };

  const saveEdit = (curr) => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val > 0) {
      onUpdateCustomRates({
        ...customRates,
        [curr]: val
      });
    }
    setEditCurrency(null);
  };

  const clearOverride = (curr) => {
    const updated = { ...customRates };
    delete updated[curr];
    onUpdateCustomRates(updated);
    setEditCurrency(null);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const currencySymbols = {
    GBP: '£',
    USD: '$',
    EUR: '€',
    CNY: '¥',
    TRY: '₺'
  };

  const getSymbol = (code) => currencySymbols[code] || code;

  return (
    <div className="xe-widget glass-panel animate-fade-in">
      <div className="xe-header">
        <div className="xe-title">
          <Globe className="text-amber" size={20} />
          <span>XE Live Rates</span>
          <span className={`xe-live-dot ${Object.keys(customRates).length > 0 ? 'manual' : ''}`}></span>
        </div>
        <button 
          className="btn-icon" 
          onClick={onRefreshLive} 
          disabled={isRefreshing}
          title="Refresh exchange rates"
        >
          <RefreshCw className={isRefreshing ? 'animate-spin' : ''} size={16} />
        </button>
      </div>

      {/* Target Currencies Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {['CNY', 'TRY'].map((curr) => {
          const isOverridden = !!customRates[curr];
          const liveVal = liveRates.rates ? liveRates.rates[curr] : '—';
          const activeVal = activeRates[curr];

          return (
            <div key={curr} className="xe-rate-row">
              <div className="xe-rate-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="xe-rate-name">{nativeCurrency} to {curr} ({curr === 'CNY' ? 'China' : 'Turkey'})</span>
                  {isOverridden && (
                    <span className="badge" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--accent-amber)', border: '1px solid rgba(245,158,11,0.3)' }}>
                      Override
                    </span>
                  )}
                </div>
                
                {editCurrency === curr ? (
                  <div className="xe-rate-input-container" style={{ marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{getSymbol(curr)}</span>
                    <input
                      type="number"
                      className="xe-input"
                      value={editValue}
                      step="0.001"
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(curr)}
                      autoFocus
                    />
                    <button className="btn-icon" onClick={() => saveEdit(curr)} style={{ color: 'var(--accent-emerald)' }}>
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <span className="xe-rate-val">
                    1 {getSymbol(nativeCurrency)} = {parseFloat(activeVal).toFixed(4)} {getSymbol(curr)}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {editCurrency !== curr && (
                  <button 
                    className="btn-icon" 
                    onClick={() => startEditing(curr, activeVal)}
                    title="Edit Rate Override"
                  >
                    <Edit3 size={14} />
                  </button>
                )}
                {isOverridden && (
                  <button 
                    className="btn-text" 
                    onClick={() => clearOverride(curr)} 
                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Calculator Converter */}
      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '0.5rem' }}>
        <h4 style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Quick Converter
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount</label>
              <input
                type="number"
                className="form-control"
                value={converterAmount}
                onChange={(e) => setConverterAmount(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ width: '80px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>From</label>
              <select
                className="select-filter"
                value={converterFrom}
                onChange={(e) => setConverterFrom(e.target.value)}
                style={{ padding: '0.5rem', fontSize: '0.85rem', height: '36px' }}
              >
                {['GBP', 'USD', 'EUR', 'CNY', 'TRY'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ width: '80px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>To</label>
              <select
                className="select-filter"
                value={converterTo}
                onChange={(e) => setConverterTo(e.target.value)}
                style={{ padding: '0.5rem', fontSize: '0.85rem', height: '36px' }}
              >
                {['GBP', 'USD', 'EUR', 'CNY', 'TRY'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Converted Result:</span>
            <span style={{ fontStyle: 'normal', fontWeight: '800', fontSize: '1.15rem', color: 'var(--accent-cyan)' }}>
              {getSymbol(converterTo)} {handleConvert()}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="stats-footer" style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
        <span>Rates API: {liveRates.source || 'Offline'}</span>
        <span>•</span>
        <span>Refreshed: {formatDateTime(liveRates.updatedAt)}</span>
      </div>
    </div>
  );
}
