import React, { useState, useEffect } from 'react';
import { X, Calculator, Info, Package, Truck, Layers } from 'lucide-react';
import { calculateLandedCost } from '../utils/costCalculator';

export default function ProductModal({
  product,
  onSave,
  onClose,
  nativeCurrency,
  exchangeRates
}) {
  const [formData, setFormData] = useState({
    id: '',
    sku: '',
    name: '',
    origin: 'China',
    purchaseCurrency: 'CNY',
    foreignPrice: '',
    dutyRatePct: '6.5',
    piecesPerCarton: '',
    numCartons: '',
    cartonLength: '',
    cartonWidth: '',
    cartonHeight: '',
    grossWeightPerCarton: '',
    shippingCostPerCarton: '',
    localHandlingPerCarton: '',
    status: 'Warehouse',
    // Warehouse location details
    warehouseZone: 'Zone A',
    warehouseAisle: '1',
    warehouseShelf: 'A',
    warehouseBin: '1',
    // Transit details
    transitCarrier: '',
    transitVessel: '',
    transitEta: ''
  });

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        // Make sure fields are strings for input components
        foreignPrice: product.foreignPrice?.toString() || '',
        dutyRatePct: product.dutyRatePct?.toString() || '0',
        piecesPerCarton: product.piecesPerCarton?.toString() || '',
        numCartons: product.numCartons?.toString() || '',
        cartonLength: product.cartonLength?.toString() || '',
        cartonWidth: product.cartonWidth?.toString() || '',
        cartonHeight: product.cartonHeight?.toString() || '',
        grossWeightPerCarton: product.grossWeightPerCarton?.toString() || '',
        shippingCostPerCarton: product.shippingCostPerCarton?.toString() || '',
        localHandlingPerCarton: product.localHandlingPerCarton?.toString() || '',
        warehouseZone: product.warehouseZone || 'Zone A',
        warehouseAisle: product.warehouseAisle?.toString() || '1',
        warehouseShelf: product.warehouseShelf || 'A',
        warehouseBin: product.warehouseBin?.toString() || '1',
        transitCarrier: product.transitCarrier || '',
        transitVessel: product.transitVessel || '',
        transitEta: product.transitEta || ''
      });
    }
  }, [product]);

  // Adjust currency default when origin changes
  const handleOriginChange = (e) => {
    const origin = e.target.value;
    const purchaseCurrency = origin === 'China' ? 'CNY' : 'TRY';
    const dutyRatePct = origin === 'China' ? '6.5' : '4.0'; // sensible customs rates
    setFormData(prev => ({
      ...prev,
      origin,
      purchaseCurrency,
      dutyRatePct
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Perform real-time calculations based on current form state
  const activeRate = exchangeRates[formData.purchaseCurrency] || 1;
  const calculations = calculateLandedCost(formData, activeRate);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.sku || !formData.name) {
      alert('SKU and Product Name are required.');
      return;
    }

    // Convert numeric fields back to numbers
    const processedProduct = {
      ...formData,
      id: formData.id || 'prod_' + Date.now(),
      foreignPrice: parseFloat(formData.foreignPrice) || 0,
      dutyRatePct: parseFloat(formData.dutyRatePct) || 0,
      piecesPerCarton: parseInt(formData.piecesPerCarton) || 1,
      numCartons: parseInt(formData.numCartons) || 0,
      cartonLength: parseFloat(formData.cartonLength) || 0,
      cartonWidth: parseFloat(formData.cartonWidth) || 0,
      cartonHeight: parseFloat(formData.cartonHeight) || 0,
      grossWeightPerCarton: parseFloat(formData.grossWeightPerCarton) || 0,
      shippingCostPerCarton: parseFloat(formData.shippingCostPerCarton) || 0,
      localHandlingPerCarton: parseFloat(formData.localHandlingPerCarton) || 0,
      warehouseAisle: parseInt(formData.warehouseAisle) || 1,
      warehouseBin: parseInt(formData.warehouseBin) || 1
    };

    onSave(processedProduct);
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
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in">
        <div className="modal-header">
          <h3 className="modal-title">
            {product ? 'Edit Inventory Item' : 'New Bespoke Inventory Item'}
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
              
              {/* Two Column Layout: Form Fields vs Live Landed Cost Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                
                {/* Section: Product Information */}
                <div>
                  <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Package size={16} />
                    <span>Product Core Info</span>
                  </div>
                  <div className="form-grid form-grid-3" style={{ marginTop: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">SKU / Code *</label>
                      <input
                        type="text"
                        name="sku"
                        className="form-control"
                        placeholder="e.g. CHN-BLK-09"
                        value={formData.sku}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Product Name *</label>
                      <input
                        type="text"
                        name="name"
                        className="form-control"
                        placeholder="e.g. Bamboo Fiber Weave Cushions"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-grid form-grid-3" style={{ marginTop: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Origin Country</label>
                      <select
                        name="origin"
                        className="select-filter"
                        value={formData.origin}
                        onChange={handleOriginChange}
                        style={{ height: '38px' }}
                      >
                        <option value="China">China</option>
                        <option value="Turkey">Turkey</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Purchase Currency</label>
                      <select
                        name="purchaseCurrency"
                        className="select-filter"
                        value={formData.purchaseCurrency}
                        onChange={handleChange}
                        style={{ height: '38px' }}
                      >
                        <option value="CNY">CNY (¥)</option>
                        <option value="TRY">TRY (₺)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Purchase Price (Foreign)</label>
                      <input
                        type="number"
                        name="foreignPrice"
                        step="0.01"
                        className="form-control"
                        placeholder="e.g. 85.00"
                        value={formData.foreignPrice}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Packaging, Volume & Weights */}
                <div>
                  <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={16} />
                    <span>Carton & Packaging Metrics</span>
                  </div>
                  <div className="form-grid form-grid-3" style={{ marginTop: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Pcs / Carton</label>
                      <input
                        type="number"
                        name="piecesPerCarton"
                        placeholder="e.g. 50"
                        className="form-control"
                        value={formData.piecesPerCarton}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Total Cartons</label>
                      <input
                        type="number"
                        name="numCartons"
                        placeholder="e.g. 12"
                        className="form-control"
                        value={formData.numCartons}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Gross Weight / Carton (kg)</label>
                      <input
                        type="number"
                        name="grossWeightPerCarton"
                        step="0.1"
                        placeholder="e.g. 18.5"
                        className="form-control"
                        value={formData.grossWeightPerCarton}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-grid form-grid-3" style={{ marginTop: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Carton Length (cm)</label>
                      <input
                        type="number"
                        name="cartonLength"
                        placeholder="e.g. 60"
                        className="form-control"
                        value={formData.cartonLength}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Carton Width (cm)</label>
                      <input
                        type="number"
                        name="cartonWidth"
                        placeholder="e.g. 40"
                        className="form-control"
                        value={formData.cartonWidth}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Carton Height (cm)</label>
                      <input
                        type="number"
                        name="cartonHeight"
                        placeholder="e.g. 45"
                        className="form-control"
                        value={formData.cartonHeight}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Landed Cost Settings */}
                <div>
                  <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calculator size={16} />
                    <span>Landed Cost Apportionment (Native Currency)</span>
                  </div>
                  <div className="form-grid form-grid-3" style={{ marginTop: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Duty Rate %</label>
                      <input
                        type="number"
                        name="dutyRatePct"
                        step="0.1"
                        placeholder="6.5"
                        className="form-control"
                        value={formData.dutyRatePct}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Freight / Carton ({getSymbol(nativeCurrency)})</label>
                      <input
                        type="number"
                        name="shippingCostPerCarton"
                        step="0.01"
                        placeholder="e.g. 35.00"
                        className="form-control"
                        value={formData.shippingCostPerCarton}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Local Handling / Carton ({getSymbol(nativeCurrency)})</label>
                      <input
                        type="number"
                        name="localHandlingPerCarton"
                        step="0.01"
                        placeholder="e.g. 4.50"
                        className="form-control"
                        value={formData.localHandlingPerCarton}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Logistics and Locations */}
                <div>
                  <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Truck size={16} />
                    <span>Logistics & Location Status</span>
                  </div>
                  <div className="form-grid form-grid-2" style={{ marginTop: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select
                        name="status"
                        className="select-filter"
                        value={formData.status}
                        onChange={handleChange}
                        style={{ height: '38px' }}
                      >
                        <option value="Warehouse">In Warehouse</option>
                        <option value="Transit">In Transit</option>
                      </select>
                    </div>

                    {formData.status === 'Warehouse' ? (
                      <div className="form-grid form-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                        <div className="form-group">
                          <label className="form-label">Zone</label>
                          <select name="warehouseZone" className="select-filter" value={formData.warehouseZone} onChange={handleChange} style={{ height: '38px', padding: '0.5rem' }}>
                            {['Zone A', 'Zone B', 'Zone C', 'Zone D'].map(z => <option key={z} value={z}>{z}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Aisle</label>
                          <input type="number" name="warehouseAisle" className="form-control" min="1" max="100" value={formData.warehouseAisle} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Shelf</label>
                          <select name="warehouseShelf" className="select-filter" value={formData.warehouseShelf} onChange={handleChange} style={{ height: '38px', padding: '0.5rem' }}>
                            {['A', 'B', 'C', 'D', 'E', 'F'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Bin</label>
                          <input type="number" name="warehouseBin" className="form-control" min="1" max="100" value={formData.warehouseBin} onChange={handleChange} />
                        </div>
                      </div>
                    ) : (
                      <div className="form-grid form-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                        <div className="form-group">
                          <label className="form-label">Carrier</label>
                          <input type="text" name="transitCarrier" className="form-control" placeholder="e.g. Maersk" value={formData.transitCarrier} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Vessel/Flight</label>
                          <input type="text" name="transitVessel" className="form-control" placeholder="e.g. MS-92" value={formData.transitVessel} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">ETA Date</label>
                          <input type="date" name="transitEta" className="form-control" value={formData.transitEta} onChange={handleChange} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Calculation Summary Side Panel */}
                <div style={{ marginTop: '0.5rem' }}>
                  <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-emerald)' }}>
                    <Info size={16} />
                    <span>Landed Cost Breakdown (Calculated Real-Time)</span>
                  </div>
                  
                  <div className="cost-breakdown-box" style={{ marginTop: '0.75rem' }}>
                    <div className="cost-breakdown-row">
                      <span>Total pieces in order:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{calculations.totalPieces} pcs ({formData.numCartons || 0} cartons)</strong>
                    </div>
                    <div className="cost-breakdown-row">
                      <span>Total volume & weight:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {calculations.totalCbm.toFixed(3)} CBM | {calculations.totalWeight.toFixed(1)} kg
                      </strong>
                    </div>
                    <div className="cost-breakdown-row" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.5rem' }}>
                      <span>Base Purchase Cost (per piece):</span>
                      <span>{getSymbol(formData.purchaseCurrency)}{parseFloat(formData.foreignPrice || 0).toFixed(2)} / {getSymbol(nativeCurrency)}{calculations.nativePricePerPiece.toFixed(2)}</span>
                    </div>
                    <div className="cost-breakdown-row">
                      <span>Customs Duty (per piece):</span>
                      <span>{getSymbol(nativeCurrency)}{calculations.dutyCostPerPiece.toFixed(2)} ({formData.dutyRatePct || 0}%)</span>
                    </div>
                    <div className="cost-breakdown-row">
                      <span>Shipping Apportioned (per piece):</span>
                      <span>{getSymbol(nativeCurrency)}{calculations.shippingCostPerPiece.toFixed(2)}</span>
                    </div>
                    <div className="cost-breakdown-row">
                      <span>Local Handling (per piece):</span>
                      <span>{getSymbol(nativeCurrency)}{calculations.localHandlingPerPiece.toFixed(2)}</span>
                    </div>
                    <div className="cost-breakdown-row total">
                      <span>Landed Cost (per piece):</span>
                      <span>{getSymbol(nativeCurrency)}{calculations.landedCostPerPiece.toFixed(2)}</span>
                    </div>
                    <div className="cost-breakdown-row" style={{ fontStyle: 'italic', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      <span>Total landed value of order:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                        {getSymbol(nativeCurrency)}{calculations.totalLandedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
