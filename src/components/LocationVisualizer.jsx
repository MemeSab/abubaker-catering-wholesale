import React from 'react';
import { Compass, Warehouse, Anchor, Box, Calendar, Truck, ArrowRight } from 'lucide-react';

export default function LocationVisualizer({ products }) {
  // 1. Group products by warehouse zone
  const warehouseZones = {
    'Zone A': [],
    'Zone B': [],
    'Zone C': [],
    'Zone D': []
  };

  const transitShipments = [];

  products.forEach(p => {
    if (p.status === 'Warehouse') {
      const zone = p.warehouseZone || 'Zone A';
      if (warehouseZones[zone]) {
        warehouseZones[zone].push(p);
      } else {
        warehouseZones[p.warehouseZone] = [p];
      }
    } else {
      transitShipments.push(p);
    }
  });

  const getStageIndex = (status) => {
    const stages = ['Production', 'Port Origin', 'Ocean Voyage', 'Customs Clearance', 'Local Delivery', 'Warehouse'];
    const idx = stages.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-fade-in">
      
      {/* SECTION: TRANSIT SHIPPINGS FROM CHINA & TURKEY */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
          <Compass className="text-amber" size={20} />
          <span>Active Import Shipments & Logistics Milestones</span>
        </h3>

        {transitShipments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            No active shipments currently in transit. All goods are on warehouse shelves.
          </div>
        ) : (
          <div className="transit-timeline">
            {transitShipments.map(p => {
              const stageIdx = getStageIndex(p.status);
              
              return (
                <div key={p.id} className="transit-shipment">
                  {/* Left Info Panel */}
                  <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span className="cell-sku">{p.sku}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, maxWidth: '170px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.name}>
                      {p.name}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                      <span className={`badge badge-${p.origin.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>
                        From {p.origin}
                      </span>
                      <span className="badge" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                        {p.status}
                      </span>
                    </div>
                  </div>

                  {/* Middle Timeline Map */}
                  <div className="transit-route">
                    {/* Factory */}
                    <div className={`route-node origin ${stageIdx >= 0 ? 'active' : ''}`}>
                      <div className="route-node-label">1. Factory</div>
                    </div>

                    {/* Port Load */}
                    <div className={`route-node ${stageIdx >= 1 ? 'active' : ''}`}>
                      <div className="route-node-label">2. Port Load</div>
                    </div>

                    {/* Ocean Voyage */}
                    <div className={`route-node ${stageIdx >= 2 ? 'active' : ''}`}>
                      <div className="route-node-label">3. Voyage</div>
                    </div>

                    {/* Customs Clearance */}
                    <div className={`route-node ${stageIdx >= 3 ? 'active' : ''}`}>
                      <div className="route-node-label">4. Customs</div>
                    </div>

                    {/* Local Delivery */}
                    <div className={`route-node destination ${stageIdx >= 4 ? 'active' : ''}`}>
                      <div className="route-node-label">5. Delivery</div>
                    </div>
                  </div>

                  {/* Right Logistics Panel */}
                  <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                      <Truck size={12} className="text-cyan" />
                      <span>Carrier: <strong>{p.transitCarrier || 'N/A'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                      <Anchor size={12} />
                      <span>Vessel/Flight: <strong>{p.transitVessel || 'N/A'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                      <Calendar size={12} className="text-amber" />
                      <span>ETA: <strong style={{ color: 'var(--accent-amber)' }}>{p.transitEta || 'TBD'}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION: WAREHOUSE GRID VISUALIZER */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
          <Warehouse className="text-cyan" size={20} />
          <span>Warehouse Storage Layout (Zones, Aisles, Shelves, Bins)</span>
        </h3>
        
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          This visual represents stock distributed across your local storage zones. Hover over individual items to view SKU allocations.
        </p>

        <div className="warehouse-grid">
          {Object.entries(warehouseZones).map(([zoneName, items]) => {
            const totalPcs = items.reduce((sum, item) => sum + (parseInt(item.piecesPerCarton) * parseInt(item.numCartons) || 0), 0);
            const totalWeight = items.reduce((sum, item) => sum + (parseFloat(item.grossWeightPerCarton) * parseInt(item.numCartons) || 0), 0);
            
            return (
              <div key={zoneName} className="warehouse-zone">
                <div className="zone-header">
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{zoneName}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    {totalPcs.toLocaleString()} pcs | {totalWeight.toFixed(0)} kg
                  </span>
                </div>
                
                <div className="zone-items">
                  {items.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: '1rem 0', textAlign: 'center', fontstyle: 'italic' }}>
                      Zone Empty
                    </div>
                  ) : (
                    items.map(item => (
                      <div key={item.id} className="zone-item">
                        <div>
                          <div className="zone-item-sku">{item.sku}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                            {((item.piecesPerCarton || 1) * (item.numCartons || 0)).toLocaleString()} pcs
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                            Loc: A{item.warehouseAisle}/S{item.warehouseShelf}/B{item.warehouseBin}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
}
