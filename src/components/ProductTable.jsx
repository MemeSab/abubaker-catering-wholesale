import React, { useState } from 'react';
import { Search, Plus, FileSpreadsheet, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { calculateLandedCost } from '../utils/costCalculator';

export default function ProductTable({
  products,
  exchangeRates,
  nativeCurrency,
  onEdit,
  onDelete,
  onAddClick
}) {
  const [search, setSearch] = useState('');
  const [originFilter, setOriginFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState('sku');
  const [sortAsc, setSortAsc] = useState(true);

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

  const filteredProducts = processedProducts.filter(item => {
    const matchesSearch = 
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.transitCarrier && item.transitCarrier.toLowerCase().includes(search.toLowerCase())) ||
      (item.warehouseZone && item.warehouseZone.toLowerCase().includes(search.toLowerCase()));

    const matchesOrigin = originFilter === 'All' || item.origin === originFilter;
    
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

    return matchesSearch && matchesOrigin && matchesStatus;
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
      'SKU', 'Name', 'Origin', 'Status', 'Location Details', 'Foreign Price', 
      'Currency', 'Duty Rate %', 'Cartons', 'Pieces/Carton', 'Total Pieces', 
      'Gross Weight (kg)', 'Total Volume (CBM)', `Landed Cost (${nativeCurrency})`, `Total Value (${nativeCurrency})`
    ];

    const rows = sortedProducts.map(p => {
      const locationDetail = p.status === 'Warehouse' 
        ? `${p.warehouseZone} Aisle ${p.warehouseAisle} Shelf ${p.warehouseShelf} Bin ${p.warehouseBin}`
        : `${p.transitCarrier || 'Carrier'} (${p.transitVessel || 'Vessel'}) ETA:${p.transitEta || 'N/A'}`;

      return [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        p.origin,
        p.status,
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

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header controls */}
      <div className="table-controls">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search products by SKU, name, carrier..."
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

          <button className="btn btn-secondary" onClick={exportToCsv} disabled={sortedProducts.length === 0} title="Export CSV Report">
            <FileSpreadsheet size={16} />
            <span>Export CSV</span>
          </button>

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
                <th onClick={() => handleSort('sku')} style={{ cursor: 'pointer' }}>SKU{getSortIndicator('sku')}</th>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Product Name{getSortIndicator('name')}</th>
                <th onClick={() => handleSort('origin')} style={{ cursor: 'pointer' }}>Origin{getSortIndicator('origin')}</th>
                <th>Location Details</th>
                <th onClick={() => handleSort('pieces')} style={{ cursor: 'pointer', textAlign: 'right' }}>Total Pcs{getSortIndicator('pieces')}</th>
                <th style={{ textAlign: 'right' }}>Gross Wt (kg)</th>
                <th style={{ textAlign: 'right' }}>CBM</th>
                <th style={{ textAlign: 'right' }}>Buying Price</th>
                <th onClick={() => handleSort('landedCost')} style={{ cursor: 'pointer', textAlign: 'right' }}>Landed / Pc{getSortIndicator('landedCost')}</th>
                <th onClick={() => handleSort('totalValue')} style={{ cursor: 'pointer', textAlign: 'right' }}>Landed Value{getSortIndicator('totalValue')}</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map((p) => {
                const locationText = p.status === 'Warehouse' 
                  ? `${p.warehouseZone} (${p.warehouseShelf}${p.warehouseBin})`
                  : `${p.transitCarrier || 'Transit'}`;

                return (
                  <tr key={p.id} className="animate-fade-in">
                    <td className="cell-sku">{p.sku}</td>
                    <td style={{ fontWeight: '500', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.name}>
                      {p.name}
                    </td>
                    <td>
                      <span className={`badge badge-${p.origin.toLowerCase()}`}>
                        {p.origin}
                      </span>
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
    </div>
  );
}
