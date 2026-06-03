import React, { useState, useEffect } from 'react';
import { fetchLiveRates, getCustomRates, saveCustomRates } from './services/exchangeRate';
import XeWidget from './components/XeWidget';
import ProductTable from './components/ProductTable';
import ProductModal from './components/ProductModal';
import LocationVisualizer from './components/LocationVisualizer';
import DashboardStats from './components/DashboardStats';
import { Package, MapPin, Settings2 } from 'lucide-react';

const LOCAL_STORAGE_PRODUCTS_KEY = 'bespoke_inventory_products';
const LOCAL_STORAGE_CURRENCY_KEY = 'bespoke_inventory_native_currency';

// Initial Seed Products
const SEED_PRODUCTS = [
  {
    id: 'prod_1',
    sku: 'CHN-RUG-WVE',
    name: 'Woven Outdoor Rugs (Bamboo fiber)',
    origin: 'China',
    purchaseCurrency: 'CNY',
    foreignPrice: 120.00,
    dutyRatePct: 6.5,
    piecesPerCarton: 40,
    numCartons: 15,
    cartonLength: 70,
    cartonWidth: 45,
    cartonHeight: 50,
    grossWeightPerCarton: 22.4,
    shippingCostPerCarton: 45.00,
    localHandlingPerCarton: 5.50,
    status: 'Warehouse',
    warehouseZone: 'Zone A',
    warehouseAisle: 3,
    warehouseShelf: 'C',
    warehouseBin: 14,
    allocatedClient: 'AbuBaker Catering'
  },
  {
    id: 'prod_2',
    sku: 'TRK-POT-CER',
    name: 'Glazed Ceramic Terracotta Pots',
    origin: 'Turkey',
    purchaseCurrency: 'TRY',
    foreignPrice: 380.00,
    dutyRatePct: 4.0,
    piecesPerCarton: 12,
    numCartons: 40,
    cartonLength: 50,
    cartonWidth: 50,
    cartonHeight: 40,
    grossWeightPerCarton: 18.2,
    shippingCostPerCarton: 38.00,
    localHandlingPerCarton: 4.00,
    status: 'Warehouse',
    warehouseZone: 'Zone B',
    warehouseAisle: 9,
    warehouseShelf: 'A',
    warehouseBin: 5,
    allocatedClient: 'London Hospitality Group'
  },
  {
    id: 'prod_3',
    sku: 'CHN-LED-SLR',
    name: 'Smart Waterproof Solar Path Lights',
    origin: 'China',
    purchaseCurrency: 'CNY',
    foreignPrice: 45.00,
    dutyRatePct: 6.5,
    piecesPerCarton: 100,
    numCartons: 8,
    cartonLength: 60,
    cartonWidth: 40,
    cartonHeight: 40,
    grossWeightPerCarton: 14.5,
    shippingCostPerCarton: 50.00,
    localHandlingPerCarton: 6.00,
    status: 'Transit',
    transitCarrier: 'Cosco Shipping',
    transitVessel: 'COSCO-AURA-9',
    transitEta: '2026-06-20',
    allocatedClient: 'AbuBaker Catering'
  },
  {
    id: 'prod_4',
    sku: 'TRK-COT-TWL',
    name: 'Luxury Aegean Organic Cotton Towels',
    origin: 'Turkey',
    purchaseCurrency: 'TRY',
    foreignPrice: 195.00,
    dutyRatePct: 4.0,
    piecesPerCarton: 30,
    numCartons: 20,
    cartonLength: 60,
    cartonWidth: 40,
    cartonHeight: 50,
    grossWeightPerCarton: 16.8,
    shippingCostPerCarton: 32.00,
    localHandlingPerCarton: 3.50,
    status: 'Transit',
    transitCarrier: 'Turkish Cargo',
    transitVessel: 'TK-FLIGHT-882',
    transitEta: '2026-06-08',
    allocatedClient: ''
  }
];

export default function App() {
  const [products, setProducts] = useState([]);
  const [nativeCurrency, setNativeCurrency] = useState('GBP');
  const [liveRates, setLiveRates] = useState({ rates: {}, updatedAt: null, source: 'Loading...' });
  const [customRates, setCustomRates] = useState({});
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'locations'
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);
  const [modalProduct, setModalProduct] = useState(null); // null = closed, {} = add, productObj = edit
  const [showModal, setShowModal] = useState(false);

  // 1. Initial State Load
  useEffect(() => {
    const storedProducts = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
    if (storedProducts) {
      setProducts(JSON.parse(storedProducts));
    } else {
      setProducts(SEED_PRODUCTS);
      localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(SEED_PRODUCTS));
    }

    const storedCurrency = localStorage.getItem(LOCAL_STORAGE_CURRENCY_KEY);
    if (storedCurrency) {
      setNativeCurrency(storedCurrency);
    }

    setCustomRates(getCustomRates());
  }, []);

  // 2. Fetch Exchange Rates when base native currency changes
  useEffect(() => {
    async function loadRates() {
      setIsRefreshingRates(true);
      const ratesData = await fetchLiveRates(nativeCurrency);
      setLiveRates(ratesData);
      setIsRefreshingRates(false);
    }
    loadRates();
  }, [nativeCurrency]);

  const handleRefreshRates = async () => {
    setIsRefreshingRates(true);
    // Force bypass of local cache in service by clearing cache keys or just fetching
    localStorage.removeItem(`bespoke_exchange_rates_${nativeCurrency}`);
    const ratesData = await fetchLiveRates(nativeCurrency);
    setLiveRates(ratesData);
    setIsRefreshingRates(false);
  };

  const handleUpdateCustomRates = (updatedOverrides) => {
    setCustomRates(updatedOverrides);
    saveCustomRates(updatedOverrides);
  };

  const handleNativeCurrencyChange = (e) => {
    const newCurr = e.target.value;
    setNativeCurrency(newCurr);
    localStorage.setItem(LOCAL_STORAGE_CURRENCY_KEY, newCurr);
    // Clear custom overrides when currency switches to avoid logic mixups, 
    // or keep them. Let's reset the overrides so they match the new native base.
    setCustomRates({});
    saveCustomRates({});
  };

  // 3. Save Products to LocalStorage
  const saveProducts = (updatedProducts) => {
    setProducts(updatedProducts);
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(updatedProducts));
  };

  const handleAddProduct = () => {
    setModalProduct(null);
    setShowModal(true);
  };

  const handleEditProduct = (product) => {
    setModalProduct(product);
    setShowModal(true);
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      const filtered = products.filter(p => p.id !== id);
      saveProducts(filtered);
    }
  };

  const handleSaveProduct = (productData) => {
    if (products.some(p => p.id === productData.id)) {
      // Edit mode
      const updated = products.map(p => p.id === productData.id ? productData : p);
      saveProducts(updated);
    } else {
      // Add mode
      saveProducts([...products, productData]);
    }
    setShowModal(false);
  };

  const handleImportProducts = (importedList) => {
    saveProducts([...products, ...importedList]);
  };

  // Get active rates for calculations (combining live + custom overrides)
  const activeRates = {
    CNY: customRates.CNY || liveRates.rates.CNY || 9.15,
    TRY: customRates.TRY || liveRates.rates.TRY || 40.50,
    USD: liveRates.rates.USD || 1.27,
    EUR: liveRates.rates.EUR || 1.17,
    GBP: liveRates.rates.GBP || 1.0,
  };

  return (
    <div className="app-container">
      
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="brand">
          <span>AbuBaker Catering Wholesale</span>
          <span style={{ fontSize: '0.8rem', padding: '0.15rem 0.5rem', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', letterSpacing: '1px', fontWeight: '500', color: 'var(--text-secondary)' }}>
            INVENTORY OS
          </span>
        </div>

        <div className="navbar-actions">
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <button 
              className={`btn ${activeTab === 'ledger' ? 'btn-primary' : 'btn-text'}`}
              onClick={() => setActiveTab('ledger')}
              style={{ padding: '0.4rem 1rem', borderRadius: '8px' }}
            >
              <Package size={14} />
              <span>Inventory Ledger</span>
            </button>
            <button 
              className={`btn ${activeTab === 'locations' ? 'btn-primary' : 'btn-text'}`}
              onClick={() => setActiveTab('locations')}
              style={{ padding: '0.4rem 1rem', borderRadius: '8px' }}
            >
              <MapPin size={14} />
              <span>Locations Map</span>
            </button>
          </div>

          {/* Native Base Currency Setting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings2 size={16} className="text-secondary" />
            <select
              className="select-filter"
              value={nativeCurrency}
              onChange={handleNativeCurrencyChange}
              style={{ height: '36px', padding: '0.4rem 0.75rem' }}
            >
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="main-content">
        
        {/* TOP LEVEL: STATS OVERVIEW */}
        <DashboardStats 
          products={products}
          nativeCurrency={nativeCurrency}
          exchangeRates={activeRates}
        />

        {/* WORKSPACE CONTENT: TAB + XE CURRENCY SIDEBAR */}
        <div className="section-split">
          
          {/* Main workspace */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
            {activeTab === 'ledger' ? (
              <ProductTable
                products={products}
                exchangeRates={activeRates}
                nativeCurrency={nativeCurrency}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                onAddClick={handleAddProduct}
                onImport={handleImportProducts}
              />
            ) : (
              <LocationVisualizer products={products} />
            )}
          </div>

          {/* XE Currency Sidebar */}
          <div>
            <XeWidget
              nativeCurrency={nativeCurrency}
              liveRates={liveRates}
              customRates={customRates}
              onUpdateCustomRates={handleUpdateCustomRates}
              onRefreshLive={handleRefreshRates}
              isRefreshing={isRefreshingRates}
            />
          </div>

        </div>

      </main>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <ProductModal
          product={modalProduct}
          nativeCurrency={nativeCurrency}
          exchangeRates={activeRates}
          onSave={handleSaveProduct}
          onClose={() => setShowModal(false)}
        />
      )}

    </div>
  );
}
