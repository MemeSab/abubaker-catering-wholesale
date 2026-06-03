import React, { useState } from 'react';
import { Search, Plus, FileSpreadsheet, Trash2, Edit2, AlertCircle, Upload, Download } from 'lucide-react';
import { calculateLandedCost } from '../utils/costCalculator';

export default function ProductTable({
  products,
  exchangeRates,
  nativeCurrency,
  onEdit,
  onDelete,
  onAddClick,
  onImport,
  onResetToSeed,
  search,
  setSearch,
  originFilter,
  setOriginFilter,
  statusFilter,
  setStatusFilter,
  clientFilter,
  setClientFilter
}) {
  const [sortField, setSortField] = useState('sku');
  const [sortAsc, setSortAsc] = useState(true);

  // Advanced selection and trade quoting states
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [tablePricingTier, setTablePricingTier] = useState('tier1'); // 'tier1' (standard), 'tier2' (bulk), 'tier3' (distributor)
  const [quoteClient, setQuoteClient] = useState('');
  const [quoteCartons, setQuoteCartons] = useState({}); // { productId: cartonsToQuote }
  const [showQuotePrint, setShowQuotePrint] = useState(false);

  const currencySymbols = {
    GBP: '£',
    USD: '$',
    EUR: '€',
    CNY: '¥',
    TRY: '₺'
  };

  const getSymbol = (code) => currencySymbols[code] || code;

  // Filter and compute active pricing on the fly
  const processedProducts = products.map(product => {
    const rate = exchangeRates[product.purchaseCurrency] || 1;
    const calcs = calculateLandedCost(product, rate);
    return {
      ...product,
      calcs
    };
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleImportCsv = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) {
          alert("CSV file is empty or missing header data.");
          return;
        }

        // Parse headers: strip quotes
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const importedProducts = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          
          // Split by comma outside of double quotes
          const values = [];
          let currentVal = '';
          let inQuotes = false;
          
          for (let c = 0; c < line.length; c++) {
            const char = line[c];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentVal);
              currentVal = '';
            } else {
              currentVal += char;
            }
          }
          values.push(currentVal);

          const cleanedValues = values.map(val => val.trim().replace(/^["']|["']$/g, ''));

          if (cleanedValues.length < 5) continue;

          // Map CSV header keys to row object
          const row = {};
          headers.forEach((header, index) => {
            row[header] = cleanedValues[index];
          });

          // Build product object
          const productObj = {
            id: 'prod_csv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            sku: row.sku || `SKU-${i}`,
            name: row.name || 'Unnamed Imported Item',
            origin: row.origin || 'China',
            status: row.status || 'Warehouse',
            allocatedClient: row.allocatedClient || '',
            warehouseZone: row.warehouseZone || 'Zone A',
            warehouseAisle: parseInt(row.warehouseAisle) || 1,
            warehouseShelf: row.warehouseShelf || 'A',
            warehouseBin: parseInt(row.warehouseBin) || 1,
            transitCarrier: row.transitCarrier || '',
            transitVessel: row.transitVessel || '',
            transitEta: row.transitEta || '',
            foreignPrice: parseFloat(row.foreignPrice) || 0,
            purchaseCurrency: row.purchaseCurrency || (row.origin === 'Turkey' ? 'TRY' : 'CNY'),
            dutyRatePct: parseFloat(row.dutyRatePct) || (row.origin === 'Turkey' ? 4.0 : 6.5),
            piecesPerCarton: parseInt(row.piecesPerCarton) || 1,
            numCartons: parseInt(row.numCartons) || 0,
            cartonLength: parseFloat(row.cartonLength) || 0,
            cartonWidth: parseFloat(row.cartonWidth) || 0,
            cartonHeight: parseFloat(row.cartonHeight) || 0,
            grossWeightPerCarton: parseFloat(row.grossWeightPerCarton) || 0,
            shippingCostPerCarton: parseFloat(row.shippingCostPerCarton) || 0,
            localHandlingPerCarton: parseFloat(row.localHandlingPerCarton) || 0,
            sellingPrice: parseFloat(row.sellingPrice) || 0
          };

          importedProducts.push(productObj);
        }

        if (importedProducts.length > 0) {
          onImport(importedProducts);
          alert(`Successfully imported ${importedProducts.length} items!`);
        } else {
          alert("No valid items found to import.");
        }
      } catch (error) {
        console.error("Error parsing CSV:", error);
        alert("Error parsing CSV file. Please ensure it matches the template format.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // clear input so same file can be re-imported
  };

  // Extract unique client names
  const uniqueClients = Array.from(
    new Set(products.map(p => p.allocatedClient).filter(Boolean))
  );

  const filteredProducts = processedProducts.filter(item => {
    const sku = (item.sku || '').toString().toLowerCase();
    const name = (item.name || '').toString().toLowerCase();
    const carrier = (item.transitCarrier || '').toString().toLowerCase();
    const zone = (item.warehouseZone || '').toString().toLowerCase();
    const client = (item.allocatedClient || '').toString().toLowerCase();
    const query = search.toLowerCase();

    // Robust case-insensitive check
    const matchesSearch = 
      sku.includes(query) ||
      name.includes(query) ||
      carrier.includes(query) ||
      zone.includes(query) ||
      client.includes(query);

    const matchesOrigin = originFilter === 'All' || item.origin === originFilter;
    
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

    const matchesClient = 
      clientFilter === 'All' || 
      (clientFilter === 'Unallocated' && !item.allocatedClient) ||
      item.allocatedClient === clientFilter;

    return matchesSearch && matchesOrigin && matchesStatus && matchesClient;
  });

  // Sorting logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    // Handle nested calculated fields
    if (sortField === 'landedCost') {
      valA = a.calcs.landedCostPerPiece;
      valB = b.calcs.landedCostPerPiece;
    } else if (sortField === 'totalValue') {
      valA = a.calcs.totalLandedCost;
      valB = b.calcs.totalLandedCost;
    } else if (sortField === 'pieces') {
      valA = a.calcs.totalPieces;
      valB = b.calcs.totalPieces;
    } else if (sortField === 'sellingPrice') {
      valA = tablePricingTier === 'tier1' ? a.calcs.sellingPriceTier1 : tablePricingTier === 'tier2' ? a.calcs.sellingPriceTier2 : a.calcs.sellingPriceTier3;
      valB = tablePricingTier === 'tier1' ? b.calcs.sellingPriceTier1 : tablePricingTier === 'tier2' ? b.calcs.sellingPriceTier2 : b.calcs.sellingPriceTier3;
    } else if (sortField === 'margin') {
      valA = tablePricingTier === 'tier1' ? a.calcs.tier1MarginPct : tablePricingTier === 'tier2' ? a.calcs.tier2MarginPct : a.calcs.tier3MarginPct;
      valB = tablePricingTier === 'tier1' ? b.calcs.tier1MarginPct : tablePricingTier === 'tier2' ? b.calcs.tier2MarginPct : b.calcs.tier3MarginPct;
    }

    if (typeof valA === 'string') {
      return sortAsc 
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    } else {
      return sortAsc
        ? (valA || 0) - (valB || 0)
        : (valB || 0) - (valA || 0);
    }
  });

  // Client-side CSV export
  const exportToCsv = () => {
    if (sortedProducts.length === 0) return;

    const headers = [
      'SKU', 'Name', 'Origin', 'HS Code', 'Status', 'Allocated Client', 'Location Details', 'Foreign Price', 
      'Currency', 'Duty Rate %', 'Cartons', 'Pieces/Carton', 'Total Pieces', 
      'Gross Weight (kg)', 'Total Volume (CBM)', `Landed Cost (${nativeCurrency})`, 
      `Tier 1 Standard Price (${nativeCurrency})`, `Tier 2 Bulk Price (${nativeCurrency})`, `Tier 3 Distributor Price (${nativeCurrency})`, `Total Value (${nativeCurrency})`
    ];

    const rows = sortedProducts.map(p => {
      const locationDetail = p.status === 'Warehouse' 
        ? `${p.warehouseZone} Aisle ${p.warehouseAisle} Shelf ${p.warehouseShelf} Bin ${p.warehouseBin}`
        : `${p.transitCarrier || 'Carrier'} (${p.transitVessel || 'Vessel'}) ETA:${p.transitEta || 'N/A'}`;

      return [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        p.origin,
        p.hsCode || '',
        p.status,
        `"${(p.allocatedClient || 'Available').replace(/"/g, '""')}"`,
        `"${locationDetail}"`,
        p.foreignPrice,
        p.purchaseCurrency,
        p.dutyRatePct,
        p.numCartons,
        p.piecesPerCarton,
        p.calcs.totalPieces,
        p.calcs.totalWeight.toFixed(2),
        p.calcs.totalCbm.toFixed(3),
        p.calcs.landedCostPerPiece.toFixed(2),
        p.calcs.sellingPriceTier1.toFixed(2),
        p.calcs.sellingPriceTier2.toFixed(2),
        p.calcs.sellingPriceTier3.toFixed(2),
        p.calcs.totalLandedCost.toFixed(2)
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bespoke_inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSortIndicator = (field) => {
    if (sortField !== field) return '';
    return sortAsc ? ' ↑' : ' ↓';
  };

  const handleToggleSelect = (id) => {
    setSelectedProductIds(prev => {
      const isSelected = prev.includes(id);
      let updated;
      if (isSelected) {
        updated = prev.filter(item => item !== id);
      } else {
        updated = [...prev, id];
      }
      
      // Seed default cartons to quote
      if (!isSelected && !quoteCartons[id]) {
        const prod = products.find(p => p.id === id);
        setQuoteCartons(qc => ({ ...qc, [id]: prod ? (prod.numCartons || 1) : 1 }));
      }
      
      return updated;
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = sortedProducts.map(p => p.id);
      setSelectedProductIds(allIds);
      
      // Seed default cartons for all
      const defaultCartons = {};
      sortedProducts.forEach(p => {
        defaultCartons[p.id] = p.numCartons || 1;
      });
      setQuoteCartons(qc => ({ ...qc, ...defaultCartons }));
    } else {
      setSelectedProductIds([]);
    }
  };

  const templateUrl = `${import.meta.env.BASE_URL || '/'}dummy_inventory_import.csv`;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header controls */}
      <div className="table-controls">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search SKU, name, client, carrier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          {/* Origin filter */}
          <select
            className="select-filter"
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
          >
            <option value="All">All Origins</option>
            <option value="China">China Only</option>
            <option value="Turkey">Turkey Only</option>
          </select>

          {/* Location status filter */}
          <select
            className="select-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Locations</option>
            <option value="Warehouse">In Warehouse</option>
            <option value="Transit">In Transit</option>
          </select>

          {/* Client filter */}
          <select
            className="select-filter"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="All">All Clients</option>
            <option value="Unallocated">Unallocated (Available)</option>
            {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Pricing Tier View Selector */}
          <select
            className="select-filter"
            value={tablePricingTier}
            onChange={(e) => setTablePricingTier(e.target.value)}
            style={{ border: '1px solid rgba(6, 182, 212, 0.4)', background: 'rgba(6, 182, 212, 0.05)', height: '36px', padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-sm)' }}
            title="Switch the active pricing tier displayed in the table"
          >
            <option value="tier1">Tier 1: Standard Trade</option>
            <option value="tier2">Tier 2: Bulk Trade</option>
            <option value="tier3">Tier 3: Distributor</option>
          </select>

          <button className="btn btn-secondary" onClick={exportToCsv} disabled={sortedProducts.length === 0} title="Export CSV Report">
            <FileSpreadsheet size={16} />
            <span>Export CSV</span>
          </button>

          {/* Import file input and buttons */}
          <input
            type="file"
            accept=".csv"
            id="csv-import"
            style={{ display: 'none' }}
            onChange={handleImportCsv}
          />
          <button className="btn btn-secondary" onClick={() => document.getElementById('csv-import').click()} title="Import inventory CSV">
            <Upload size={16} />
            <span>Import CSV</span>
          </button>

          <a href={templateUrl} download className="btn btn-text" style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} title="Download sample import template">
            <Download size={12} />
            <span>Template</span>
          </a>

          {onResetToSeed && (
            <button className="btn btn-text" onClick={onResetToSeed} style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', color: 'rgba(244, 63, 94, 0.85)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} title="Reset database to default seed data">
              <span>Reset Defaults</span>
            </button>
          )}

          <button className="btn btn-primary" onClick={onAddClick}>
            <Plus size={16} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      {sortedProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={32} className="text-secondary" />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>No items found matching the filters or search criteria.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={selectedProductIds.length === sortedProducts.length && sortedProducts.length > 0}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th onClick={() => handleSort('sku')} style={{ cursor: 'pointer' }}>SKU{getSortIndicator('sku')}</th>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Product Name{getSortIndicator('name')}</th>
                <th onClick={() => handleSort('origin')} style={{ cursor: 'pointer' }}>Origin{getSortIndicator('origin')}</th>
                <th onClick={() => handleSort('allocatedClient')} style={{ cursor: 'pointer' }}>Client Allocation{getSortIndicator('allocatedClient')}</th>
                <th>Location Details</th>
                <th onClick={() => handleSort('pieces')} style={{ cursor: 'pointer', textAlign: 'right' }}>Total Pcs{getSortIndicator('pieces')}</th>
                <th style={{ textAlign: 'right' }}>Gross Wt (kg)</th>
                <th style={{ textAlign: 'right' }}>CBM</th>
                <th style={{ textAlign: 'right' }}>Buying Price</th>
                <th onClick={() => handleSort('landedCost')} style={{ cursor: 'pointer', textAlign: 'right' }}>Landed / Pc{getSortIndicator('landedCost')}</th>
                <th onClick={() => handleSort('sellingPrice')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                  {tablePricingTier === 'tier1' ? 'Std Price' : tablePricingTier === 'tier2' ? 'Bulk Price' : 'Dist. Price'}{getSortIndicator('sellingPrice')}
                </th>
                <th onClick={() => handleSort('margin')} style={{ cursor: 'pointer', textAlign: 'right' }}>Margin{getSortIndicator('margin')}</th>
                <th onClick={() => handleSort('totalValue')} style={{ cursor: 'pointer', textAlign: 'right' }}>Landed Value{getSortIndicator('totalValue')}</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((p) => {
                const locationText = p.status === 'Warehouse' 
                  ? `${p.warehouseZone} (${p.warehouseShelf}${p.warehouseBin})`
                  : `${p.transitCarrier || 'Transit'}`;

                // Calculate pricing based on selected tier
                const activePrice = tablePricingTier === 'tier1' ? p.calcs.sellingPriceTier1 : tablePricingTier === 'tier2' ? p.calcs.sellingPriceTier2 : p.calcs.sellingPriceTier3;
                const activeMargin = tablePricingTier === 'tier1' ? p.calcs.tier1MarginPct : tablePricingTier === 'tier2' ? p.calcs.tier2MarginPct : p.calcs.tier3MarginPct;

                return (
                  <tr key={p.id} className="animate-fade-in" style={{ background: selectedProductIds.includes(p.id) ? 'rgba(6, 182, 212, 0.04)' : '' }}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedProductIds.includes(p.id)}
                        onChange={() => handleToggleSelect(p.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td className="cell-sku">{p.sku}</td>
                    <td style={{ maxWidth: '220px' }}>
                      <div style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.name}>
                        {p.name}
                      </div>
                      {p.hsCode && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          HS: {p.hsCode}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${p.origin.toLowerCase()}`}>
                        {p.origin}
                      </span>
                    </td>
                    <td>
                      {p.allocatedClient ? (
                        <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                          {p.allocatedClient}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                          Available
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${p.status === 'Warehouse' ? 'warehouse' : 'transit'}`}>
                        {locationText}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>
                      {p.calcs.totalPieces.toLocaleString()} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '400' }}>({p.numCartons} ctn)</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{p.calcs.totalWeight.toFixed(1)}</td>
                    <td style={{ textAlign: 'right' }}>{p.calcs.totalCbm.toFixed(3)}</td>
                    <td style={{ textAlign: 'right' }} className="cell-currency">
                      {getSymbol(p.purchaseCurrency)}{parseFloat(p.foreignPrice).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }} className="cell-landed">
                      {getSymbol(nativeCurrency)}{p.calcs.landedCostPerPiece.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>
                      {activePrice > 0 
                        ? `${getSymbol(nativeCurrency)}${activePrice.toFixed(2)}`
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {activePrice > 0 ? (
                        <span className="badge" style={{ 
                          background: activeMargin >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          color: activeMargin >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          border: activeMargin >= 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.5rem'
                        }}>
                          {activeMargin.toFixed(1)}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {getSymbol(nativeCurrency)}{p.calcs.totalLandedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                        <button className="btn-icon" onClick={() => onEdit(p)} title="Edit Item">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn-icon" onClick={() => onDelete(p.id)} title="Delete Item" style={{ color: 'var(--accent-rose)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Results summary footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
        <span>Showing {filteredProducts.length} of {products.length} items</span>
        {filteredProducts.length > 0 && (
          <span style={{ fontWeight: '500' }}>
            Filtered Total Value: {getSymbol(nativeCurrency)}
            {filteredProducts.reduce((sum, item) => sum + item.calcs.totalLandedCost, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>

      {/* TRADE QUOTATION BUILDER PANEL */}
      {selectedProductIds.length > 0 && (
        <div className="glass-panel animate-fade-in" style={{ marginTop: '1.5rem', padding: '1.25rem', border: '1px solid rgba(6, 182, 212, 0.3)', background: 'rgba(6, 182, 212, 0.02)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)', display: 'inline-block' }}></span>
              <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trade Quote Builder ({selectedProductIds.length} items selected)</strong>
            </div>
            <button className="btn btn-text" onClick={() => setSelectedProductIds([])} style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Clear Selection
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Customer / Client Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. AbuBaker Catering / Grand Hotel" 
                value={quoteClient} 
                onChange={(e) => setQuoteClient(e.target.value)} 
                style={{ height: '32px', fontSize: '0.8rem' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Select Pricing Tier</label>
              <select 
                className="select-filter" 
                value={tablePricingTier} 
                onChange={(e) => setTablePricingTier(e.target.value)} 
                style={{ height: '32px', fontSize: '0.8rem', padding: '0 0.5rem' }}
              >
                <option value="tier1">Tier 1: Standard Trade</option>
                <option value="tier2">Tier 2: Bulk Trade</option>
                <option value="tier3">Tier 3: Distributor</option>
              </select>
            </div>
          </div>

          {/* Cart items listing */}
          <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingRight: '0.25rem' }}>
            {selectedProductIds.map(id => {
              const p = processedProducts.find(item => item.id === id);
              if (!p) return null;
              const cartons = quoteCartons[id] || p.numCartons || 1;
              const price = tablePricingTier === 'tier1' ? p.calcs.sellingPriceTier1 : tablePricingTier === 'tier2' ? p.calcs.sellingPriceTier2 : p.calcs.sellingPriceTier3;
              const totalPcs = cartons * (p.piecesPerCarton || 1);
              const subtotal = totalPcs * price;
              const landedCost = cartons * (p.piecesPerCarton || 1) * p.calcs.landedCostPerPiece;
              const profit = subtotal - landedCost;

              return (
                <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '0.4rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontWeight: '600' }}>{p.sku}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input 
                        type="number" 
                        min="1" 
                        value={cartons} 
                        onChange={(e) => setQuoteCartons(qc => ({ ...qc, [id]: parseInt(e.target.value) || 1 }))}
                        style={{ width: '50px', height: '24px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', borderRadius: '4px', color: 'white', fontSize: '0.75rem' }}
                      />
                      <span>ctn</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>({totalPcs.toLocaleString()} pcs)</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{getSymbol(nativeCurrency)}{subtotal.toFixed(2)}</strong>
                    <span style={{ color: profit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontSize: '0.7rem' }}>
                      (Int. Margin: {((profit / (subtotal || 1)) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Aggregate Quoting Math (Internal and Printable) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', borderTop: '1px dashed var(--border-light)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
            {/* Confidential Internal Margins */}
            <div style={{ background: 'rgba(244, 63, 94, 0.02)', border: '1px dashed rgba(244, 63, 94, 0.2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--accent-rose)', display: 'block', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '0.25rem' }}>CONFIDENTIAL: AbuBaker Internal Margins</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Landed Cost:</span>
                  <span style={{ display: 'block', fontWeight: '600' }}>
                    {getSymbol(nativeCurrency)}
                    {selectedProductIds.reduce((sum, id) => {
                      const p = processedProducts.find(item => item.id === id);
                      return sum + ((quoteCartons[id] || p.numCartons || 1) * (p?.piecesPerCarton || 1) * (p?.calcs.landedCostPerPiece || 0));
                    }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Net Profit:</span>
                  <span style={{ display: 'block', fontWeight: '700', color: 'var(--accent-emerald)' }}>
                    {getSymbol(nativeCurrency)}
                    {selectedProductIds.reduce((sum, id) => {
                      const p = processedProducts.find(item => item.id === id);
                      const cartons = quoteCartons[id] || p.numCartons || 1;
                      const pcs = cartons * (p?.piecesPerCarton || 1);
                      const price = tablePricingTier === 'tier1' ? p.calcs.sellingPriceTier1 : tablePricingTier === 'tier2' ? p.calcs.sellingPriceTier2 : p.calcs.sellingPriceTier3;
                      const profit = (pcs * price) - (pcs * (p?.calcs.landedCostPerPiece || 0));
                      return sum + profit;
                    }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quote Valuation Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer Quote Total:</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {getSymbol(nativeCurrency)}
                  {selectedProductIds.reduce((sum, id) => {
                    const p = processedProducts.find(item => item.id === id);
                    const price = tablePricingTier === 'tier1' ? p.calcs.sellingPriceTier1 : tablePricingTier === 'tier2' ? p.calcs.sellingPriceTier2 : p.calcs.sellingPriceTier3;
                    return sum + ((quoteCartons[id] || p.numCartons || 1) * (p?.piecesPerCarton || 1) * price);
                  }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowQuotePrint(true)} style={{ padding: '0.6rem 1.2rem' }}>
                <span>Generate Quote Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN PRINTABLE TRADE QUOTE SHEET OVERLAY */}
      {showQuotePrint && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'white',
          color: 'black',
          zIndex: 99999,
          overflowY: 'auto',
          padding: '2rem'
        }}>
          {/* Header Controls (Hides on browser printing) */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '800px', margin: '0 auto 2rem auto', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
            <button 
              className="btn" 
              onClick={() => setShowQuotePrint(false)} 
              style={{ padding: '0.5rem 1rem', background: '#f7fafc', border: '1px solid #cbd5e0', color: '#2d3748', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
            >
              ← Back to Dashboard
            </button>
            <button 
              className="btn" 
              onClick={() => window.print()} 
              style={{ padding: '0.5rem 1.25rem', background: '#1a202c', border: '1px solid #1a202c', color: 'white', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
            >
              Print Quote (PDF)
            </button>
          </div>

          {/* Printable Quote Sheet Page */}
          <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', padding: '1rem' }}>
            
            {/* Quote Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid black', paddingBottom: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 850, margin: 0, letterSpacing: '0.5px', color: '#1a202c' }}>ABUBAKER CATERING WHOLESALE</h1>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#718096', fontWeight: 500 }}>Trade Account Distribution & Catering Supplies</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, letterSpacing: '1px', color: '#2d3748' }}>TRADE QUOTATION</h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#718096' }}>Date: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            {/* Bill To & Reference Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', margin: '2.5rem 0' }}>
              <div>
                <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#a0aec0', letterSpacing: '0.5px' }}>Quoted To:</strong>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1a202c', marginTop: '0.35rem' }}>{quoteClient || 'Valued Trade Customer'}</div>
                <div style={{ fontSize: '0.85rem', color: '#4a5568', marginTop: '0.15rem' }}>Trade Account Reference</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#a0aec0', letterSpacing: '0.5px' }}>Quote Reference:</strong>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2d3748', marginTop: '0.35rem' }}>ACW-Q-{Date.now().toString().slice(-6)}</div>
                <div style={{ fontSize: '0.85rem', color: '#718096', marginTop: '0.15rem' }}>Pricing Tier: {tablePricingTier === 'tier1' ? 'Standard Trade' : tablePricingTier === 'tier2' ? 'Bulk Trade (Volume Discount)' : 'Distributor Rate'}</div>
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #2d3748', textAlign: 'left', fontSize: '0.8rem', textTransform: 'uppercase', color: '#4a5568', fontWeight: 700 }}>
                  <th style={{ padding: '0.75rem 0' }}>SKU / Code</th>
                  <th style={{ padding: '0.75rem 0' }}>Product Details</th>
                  <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Cartons</th>
                  <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Total Pieces</th>
                  <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Trade Price / Pc</th>
                  <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selectedProductIds.map(id => {
                  const p = processedProducts.find(item => item.id === id);
                  if (!p) return null;
                  const cartons = quoteCartons[id] || p.numCartons || 1;
                  const totalPcs = cartons * (p.piecesPerCarton || 1);
                  const price = tablePricingTier === 'tier1' ? p.calcs.sellingPriceTier1 : tablePricingTier === 'tier2' ? p.calcs.sellingPriceTier2 : p.calcs.sellingPriceTier3;
                  const subtotal = totalPcs * price;

                  return (
                    <tr key={id} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                      <td style={{ padding: '1rem 0', fontWeight: '700', color: '#2d3748' }}>{p.sku}</td>
                      <td style={{ padding: '1rem 0', color: '#4a5568' }}>{p.name}</td>
                      <td style={{ padding: '1rem 0', textAlign: 'right' }}>{cartons}</td>
                      <td style={{ padding: '1rem 0', textAlign: 'right' }}>{totalPcs.toLocaleString()}</td>
                      <td style={{ padding: '1rem 0', textAlign: 'right' }}>{getSymbol(nativeCurrency)}{price.toFixed(2)}</td>
                      <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: '700', color: '#1a202c' }}>{getSymbol(nativeCurrency)}{subtotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals Summary */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2.5rem', borderTop: '2px solid #2d3748', paddingTop: '1.25rem' }}>
              <div style={{ width: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#4a5568', padding: '0.35rem 0' }}>
                  <span>Total Cartons:</span>
                  <strong>{selectedProductIds.reduce((sum, id) => sum + (quoteCartons[id] || 1), 0)} ctn</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#4a5568', padding: '0.35rem 0' }}>
                  <span>Total Pieces:</span>
                  <strong>{selectedProductIds.reduce((sum, id) => sum + ((quoteCartons[id] || 1) * (processedProducts.find(item => item.id === id)?.piecesPerCarton || 1)), 0).toLocaleString()} pcs</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', borderTop: '1px solid #cbd5e0', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <span>Total Quote Value:</span>
                  <strong style={{ color: '#1a202c', fontWeight: '800' }}>
                    {getSymbol(nativeCurrency)}
                    {selectedProductIds.reduce((sum, id) => {
                      const p = processedProducts.find(item => item.id === id);
                      const price = tablePricingTier === 'tier1' ? p.calcs.sellingPriceTier1 : tablePricingTier === 'tier2' ? p.calcs.sellingPriceTier2 : p.calcs.sellingPriceTier3;
                      return sum + ((quoteCartons[id] || 1) * (p?.piecesPerCarton || 1) * price);
                    }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            </div>

            {/* Terms and Footnote */}
            <div style={{ marginTop: '5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', fontSize: '0.75rem', color: '#718096', textAlign: 'center', lineHeight: '1.4' }}>
              <p style={{ margin: 0, fontWeight: '600' }}>Thank you for your business. AbuBaker Catering Wholesale supply terms apply.</p>
              <p style={{ margin: '0.25rem 0 0 0' }}>Prices quoted are trade prices and are guaranteed for 14 days. Logistics lead times depend on custom clearance intervals.</p>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
