import React from 'react';
import { DollarSign, Percent, Package, Scale, TrendingUp, Compass, Calendar, Clock, Truck } from 'lucide-react';
import { calculateLandedCost } from '../utils/costCalculator';

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
  let totalCbmActive = 0; // CBM for items in transit/production (not Warehouse)
  
  let chinaCount = 0;
  let turkeyCount = 0;
  let transitCount = 0;
  let warehouseCount = 0;

  // Client allocations tracking
  const clientValuations = {};
  let totalAvailableValue = 0;

  // Projected profit and revenue aggregates
  let totalRevenue = 0;
  let totalProfit = 0;

  // Cash flow aggregates
  const allPayments = [];

  products.forEach(p => {
    const rate = exchangeRates[p.purchaseCurrency] || 1;
    const calcs = calculateLandedCost(p, rate);

    totalPieces += calcs.totalPieces;
    totalCartons += calcs.numCartons || p.numCartons || 0;
    totalPurchaseCost += calcs.totalNativePrice;
    totalDutyCost += calcs.totalDutyCost;
    totalShippingCost += calcs.totalShippingCost;
    totalHandlingCost += calcs.totalLocalHandling;
    totalLandedValue += calcs.totalLandedCost;

    // Use Tier 1 (Standard Trade) as base for dashboard aggregates
    const sellingPrice = calcs.sellingPriceTier1;
    const itemRevenue = sellingPrice * calcs.totalPieces;
    totalRevenue += itemRevenue;
    totalProfit += calcs.tier1Profit * calcs.totalPieces;

    // Client allocations sum
    if (p.allocatedClient) {
      clientValuations[p.allocatedClient] = (clientValuations[p.allocatedClient] || 0) + calcs.totalLandedCost;
    } else {
      totalAvailableValue += calcs.totalLandedCost;
    }

    // Weight and CBM
    totalCbm += calcs.totalCbm;
    totalWeight += calcs.totalWeight;

    // Active logistics volume (not yet inside warehouse shelves)
    if (p.status !== 'Warehouse') {
      totalCbmActive += calcs.totalCbm;
      transitCount++;
    } else {
      warehouseCount++;
    }

    // Counts
    if (p.origin === 'China') chinaCount += calcs.totalPieces;
    if (p.origin === 'Turkey') turkeyCount += calcs.totalPieces;

    // Collect payment events
    if (calcs.cashFlowSchedule) {
      allPayments.push(...calcs.cashFlowSchedule);
    }
  });

  const formatCurrency = (val) => {
    return getSymbol(nativeCurrency) + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculate averages & rates
  const avgProfitMarginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  
  // Container capacities
  const cbmPercent20ft = Math.min((totalCbmActive / 33) * 100, 100);
  const cbmPercent40ft = Math.min((totalCbmActive / 67) * 100, 100);
  const containers20ftRequired = totalCbmActive / 33;

  // Payments aggregates
  const upcomingPayments = allPayments
    .filter(pay => pay.status === 'Pending')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5); // Next 5 pending payments

  const paidSum = allPayments
    .filter(pay => pay.status === 'Paid')
    .reduce((sum, pay) => sum + pay.amount, 0);

  const pendingSum = allPayments
    .filter(pay => pay.status === 'Pending')
    .reduce((sum, pay) => sum + pay.amount, 0);

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

        {/* Projected Gross Profit */}
        <div className="stats-card glass-panel animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="stats-header">
            <span>Projected Gross Profit</span>
            <TrendingUp size={18} className="text-cyan" />
          </div>
          <div className="stats-value">{formatCurrency(totalProfit)}</div>
          <div className="stats-footer">
            <span>Avg Margin: <strong>{avgProfitMarginPct.toFixed(1)}%</strong> | Rev: {formatCurrency(totalRevenue)}</span>
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
            <span>Across {totalCartons} cartons ({warehouseCount} in stock / {transitCount} in progress)</span>
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

        {/* Client Allocations Card */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
            <span style={{ fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Client Valuation Portfolio</span>
            <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', fontSize: '0.65rem' }}>Allocations</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '100px', overflowY: 'auto' }}>
            {Object.keys(clientValuations).length === 0 ? (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No client allocations logged yet.</span>
            ) : (
              Object.entries(clientValuations).map(([clientName, val]) => (
                <div key={clientName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={clientName}>
                    {clientName}
                  </span>
                  <div style={{ textAlign: 'right', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      ({((val / (totalLandedValue || 1)) * 100).toFixed(0)}%)
                    </span>
                    <strong style={{ color: 'var(--accent-emerald)', fontFamily: 'monospace' }}>{formatCurrency(val)}</strong>
                  </div>
                </div>
              ))
            )}

            <div style={{ borderTop: '1px dashed var(--border-light)', paddingTop: '0.5rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Unallocated Stock:</span>
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{formatCurrency(totalAvailableValue)}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* Advanced Import/Export Projections Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        
        {/* CONTAINER SPACE PLANNING */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', margin: 0 }}>
            <Truck className="text-amber" size={16} />
            <span>Container Space Optimization (Active Logistics)</span>
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Cargo Volume in Logistics:</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{totalCbmActive.toFixed(2)} CBM</strong>
            </div>

            {/* 20ft Container Load Capacity */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                <span>Standard 20ft Container Load (33 CBM Capacity)</span>
                <strong>{cbmPercent20ft.toFixed(1)}% Full</strong>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                <div style={{ 
                  width: `${cbmPercent20ft}%`, 
                  height: '100%', 
                  background: cbmPercent20ft >= 90 ? 'var(--accent-rose)' : cbmPercent20ft >= 75 ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                  transition: 'width 0.4s ease'
                }}></div>
              </div>
            </div>

            {/* 40ft Container Load Capacity */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                <span>High-Cube 40ft Container Load (67 CBM Capacity)</span>
                <strong>{cbmPercent40ft.toFixed(1)}% Full</strong>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                <div style={{ 
                  width: `${cbmPercent40ft}%`, 
                  height: '100%', 
                  background: cbmPercent40ft >= 90 ? 'var(--accent-rose)' : cbmPercent40ft >= 75 ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                  transition: 'width 0.4s ease'
                }}></div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-light)' }}>
              Total shipping volume requires approximately <strong>{containers20ftRequired.toFixed(1)} x 20ft containers</strong> or <strong>{(totalCbmActive / 67).toFixed(1)} x 40ft containers</strong>. Optimize container packing list to minimize LCL (Less than Container Load) rates.
            </div>
          </div>
        </div>

        {/* CASH FLOW FORECASTER */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', margin: 0 }}>
            <Calendar className="text-cyan" size={16} />
            <span>Capital Lockup & Cash Flow Calendar</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Paid Outflow</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{formatCurrency(paidSum)}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pending Outflow</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-amber)' }}>{formatCurrency(pendingSum)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>UPCOMING INVOICES & PAYMENTS:</span>
              
              {upcomingPayments.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>No pending invoices scheduled.</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {upcomingPayments.map((pay, i) => (
                    <div key={pay.id + '_' + i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '0.35rem', background: 'rgba(255,255,255,0.01)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{pay.sku} - {pay.description}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Due: {pay.date} | Stage: {pay.stage}</span>
                      </div>
                      <strong style={{ color: 'var(--accent-rose)', fontFamily: 'monospace' }}>{formatCurrency(pay.amount)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
