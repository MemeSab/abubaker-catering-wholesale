import React from 'react';
import { DollarSign, Percent, Package, Scale, TrendingUp, Compass } from 'lucide-react';

export default function DashboardStats({
  products,
  nativeCurrency,
  exchangeRates
}) {
  const currencySymbols = {
    GBP: '£',
    USD: '$',
    EUR: '€',
    CNY: '¥',
    TRY: '₺'
  };

  const getSymbol = (code) => currencySymbols[code] || code;

  // Compute overall aggregates
  let totalLandedValue = 0;
  let totalPurchaseCost = 0;
  let totalShippingCost = 0;
  let totalHandlingCost = 0;
  let totalDutyCost = 0;
  
  let totalPieces = 0;
  let totalCartons = 0;
  let totalWeight = 0;
  let totalCbm = 0;
  
  let chinaCount = 0;
  let turkeyCount = 0;
  let transitCount = 0;
  let warehouseCount = 0;

  products.forEach(p => {
    const rate = exchangeRates[p.purchaseCurrency] || 1;
    const piecesPerCarton = parseInt(p.piecesPerCarton) || 1;
    const numCartons = parseInt(p.numCartons) || 0;
    const itemPieces = piecesPerCarton * numCartons;
    
    totalPieces += itemPieces;
    totalCartons += numCartons;

    // Converted native price
    const foreignPrice = parseFloat(p.foreignPrice) || 0;
    const nativePrice = rate > 0 ? foreignPrice / rate : 0;
    const itemPurchaseCost = nativePrice * itemPieces;
    totalPurchaseCost += itemPurchaseCost;

    // Duty
    const dutyRatePct = parseFloat(p.dutyRatePct) || 0;
    const itemDutyCost = itemPurchaseCost * (dutyRatePct / 100);
    totalDutyCost += itemDutyCost;

    // Shipping & handling
    const shippingPerCarton = parseFloat(p.shippingCostPerCarton) || 0;
    const itemShippingCost = shippingPerCarton * numCartons;
    totalShippingCost += itemShippingCost;

    const handlingPerCarton = parseFloat(p.localHandlingPerCarton) || 0;
    const itemHandlingCost = handlingPerCarton * numCartons;
    totalHandlingCost += itemHandlingCost;

    // Total Landed for this item
    totalLandedValue += itemPurchaseCost + itemDutyCost + itemShippingCost + itemHandlingCost;

    // Weight and CBM
    const cartonWidth = parseFloat(p.cartonWidth) || 0;
    const cartonHeight = parseFloat(p.cartonHeight) || 0;
    const cartonLength = parseFloat(p.cartonLength) || 0;
    const cbmPerCarton = (cartonWidth * cartonHeight * cartonLength) / 1000000;
    
    totalCbm += cbmPerCarton * numCartons;
    totalWeight += (parseFloat(p.grossWeightPerCarton) || 0) * numCartons;

    // Counts
    if (p.origin === 'China') chinaCount += itemPieces;
    if (p.origin === 'Turkey') turkeyCount += itemPieces;
    
    if (p.status === 'Transit') transitCount++;
    if (p.status === 'Warehouse') warehouseCount++;
  });

  const formatCurrency = (val) => {
    return getSymbol(nativeCurrency) + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculate efficiency percentages
  const productCostPct = totalLandedValue > 0 ? (totalPurchaseCost / totalLandedValue) * 100 : 0;
  const landedOverheadPct = totalLandedValue > 0 ? ((totalShippingCost + totalHandlingCost + totalDutyCost) / totalLandedValue) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 4-Card Stats Grid */}
      <div className="dashboard-grid">
        
        {/* Total Landed Value */}
        <div className="stats-card glass-panel animate-fade-in">
          <div className="stats-header">
            <span>Total Landed Value</span>
            <TrendingUp size={18} className="text-emerald" />
          </div>
          <div className="stats-value">{formatCurrency(totalLandedValue)}</div>
          <div className="stats-footer">
            <span>Total asset valuation (Landed)</span>
          </div>
        </div>

        {/* Landed Efficiency */}
        <div className="stats-card glass-panel animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="stats-header">
            <span>Landed Cost Efficiency</span>
            <Percent size={18} className="text-cyan" />
          </div>
          <div className="stats-value">{productCostPct.toFixed(1)}%</div>
          <div className="stats-footer">
            <span>Product: {productCostPct.toFixed(0)}% | Logistics: {landedOverheadPct.toFixed(0)}%</span>
          </div>
        </div>

        {/* Inventory Quantities */}
        <div className="stats-card glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="stats-header">
            <span>Total Pieces Stored</span>
            <Package size={18} className="text-indigo" />
          </div>
          <div className="stats-value">
            {totalPieces.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>pcs</span>
          </div>
          <div className="stats-footer">
            <span>Across {totalCartons} cartons ({warehouseCount} in stock / {transitCount} in transit)</span>
          </div>
        </div>

        {/* Freight Volume / Weight */}
        <div className="stats-card glass-panel animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="stats-header">
            <span>Logistics Footprint</span>
            <Scale size={18} className="text-amber" />
          </div>
          <div className="stats-value">
            {totalWeight.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>kg</span>
          </div>
          <div className="stats-footer">
            <span>Total volume: <strong>{totalCbm.toFixed(2)} CBM</strong></span>
          </div>
        </div>

      </div>

      {/* Origin Splits & Logistics Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* China Split Card */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>China Imports</span>
            <span className="badge badge-china">China</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{chinaCount.toLocaleString()} pcs</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ({(totalPieces > 0 ? (chinaCount / totalPieces) * 100 : 0).toFixed(0)}% of stock)
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${totalPieces > 0 ? (chinaCount / totalPieces) * 100 : 0}%`, height: '100%', background: 'var(--accent-amber)' }}></div>
          </div>
        </div>

        {/* Turkey Split Card */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Turkey Imports</span>
            <span className="badge badge-turkey">Turkey</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{turkeyCount.toLocaleString()} pcs</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ({(totalPieces > 0 ? (turkeyCount / totalPieces) * 100 : 0).toFixed(0)}% of stock)
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${totalPieces > 0 ? (turkeyCount / totalPieces) * 100 : 0}%`, height: '100%', background: 'var(--accent-indigo)' }}></div>
          </div>
        </div>

      </div>

    </div>
  );
}
