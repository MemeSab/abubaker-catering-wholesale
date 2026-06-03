/**
 * Calculates volume of a carton in cubic meters (CBM)
 * @param {number} widthCm - Width in cm
 * @param {number} heightCm - Height in cm
 * @param {number} lengthCm - Length in cm
 * @returns {number} CBM
 */
export function calculateCbm(widthCm, heightCm, lengthCm) {
  const w = parseFloat(widthCm) || 0;
  const h = parseFloat(heightCm) || 0;
  const l = parseFloat(lengthCm) || 0;
  return (w * h * l) / 1000000;
}

/**
 * Calculates landed cost and totals for a product
 * @param {object} product - Product details
 * @param {number} exchangeRate - Rate from base to foreign currency (e.g., CNY per GBP = 9.15)
 * @returns {object} Calculated price breakdown
 */
export function calculateLandedCost(product, exchangeRate) {
  const piecesPerCarton = parseInt(product.piecesPerCarton) || 1;
  const numCartons = parseInt(product.numCartons) || 0;
  const totalPieces = piecesPerCarton * numCartons;

  const foreignPrice = parseFloat(product.foreignPrice) || 0;
  const rate = parseFloat(exchangeRate) || 1;
  
  // Convert foreign purchase price to native currency
  // Native Price = Foreign Price / Exchange Rate
  // e.g. 100 CNY / 9.15 CNY/GBP = £10.93
  const nativePricePerPiece = rate > 0 ? foreignPrice / rate : 0;
  
  // Duty (applied to the base purchase price in native currency)
  const dutyRatePct = parseFloat(product.dutyRatePct) || 0;
  const dutyCostPerPiece = nativePricePerPiece * (dutyRatePct / 100);
  
  // Shipping cost per carton (provided in native currency, or converted if needed. 
  // Let's assume shipping cost is configured in native currency for consistency)
  const shippingCostPerCarton = parseFloat(product.shippingCostPerCarton) || 0;
  const shippingCostPerPiece = piecesPerCarton > 0 ? shippingCostPerCarton / piecesPerCarton : 0;
  
  // Local handling fees per carton
  const localHandlingPerCarton = parseFloat(product.localHandlingPerCarton) || 0;
  const localHandlingPerPiece = piecesPerCarton > 0 ? localHandlingPerCarton / piecesPerCarton : 0;

  // Landed Cost per Piece
  const landedCostPerPiece = nativePricePerPiece + dutyCostPerPiece + shippingCostPerPiece + localHandlingPerPiece;

  // Carton details
  const cartonWidth = parseFloat(product.cartonWidth) || 0;
  const cartonHeight = parseFloat(product.cartonHeight) || 0;
  const cartonLength = parseFloat(product.cartonLength) || 0;
  
  const cbmPerCarton = calculateCbm(cartonWidth, cartonHeight, cartonLength);
  const totalCbm = cbmPerCarton * numCartons;
  
  const grossWeightPerCarton = parseFloat(product.grossWeightPerCarton) || 0;
  const totalWeight = grossWeightPerCarton * numCartons;

  // Selling & Margin calculations
  const sellingPrice = parseFloat(product.sellingPrice) || 0;
  const profitPerPiece = sellingPrice > 0 ? sellingPrice - landedCostPerPiece : 0;
  const marginPct = sellingPrice > 0 ? (profitPerPiece / sellingPrice) * 100 : 0;
  const markupPct = landedCostPerPiece > 0 ? (profitPerPiece / landedCostPerPiece) * 100 : 0;

  // 1. Tiered Pricing Calculations
  const sellingPriceTier1 = parseFloat(product.sellingPriceTier1) || sellingPrice || (landedCostPerPiece * 1.35); // Base Trade: 35% markup fallback
  const sellingPriceTier2 = parseFloat(product.sellingPriceTier2) || (sellingPriceTier1 * 0.9);                // Bulk Trade: 10% discount from Tier 1
  const sellingPriceTier3 = parseFloat(product.sellingPriceTier3) || (sellingPriceTier1 * 0.8);                // Distributor: 20% discount from Tier 1

  const tier1Profit = sellingPriceTier1 - landedCostPerPiece;
  const tier1MarginPct = sellingPriceTier1 > 0 ? (tier1Profit / sellingPriceTier1) * 100 : 0;

  const tier2Profit = sellingPriceTier2 - landedCostPerPiece;
  const tier2MarginPct = sellingPriceTier2 > 0 ? (tier2Profit / sellingPriceTier2) * 100 : 0;

  const tier3Profit = sellingPriceTier3 - landedCostPerPiece;
  const tier3MarginPct = sellingPriceTier3 > 0 ? (tier3Profit / sellingPriceTier3) * 100 : 0;

  // 2. Capital Lockup Timeline Calculations
  const factoryDepositPct = product.factoryDepositPct !== undefined && product.factoryDepositPct !== ''
    ? parseFloat(product.factoryDepositPct)
    : 30;

  const totalNativePrice = nativePricePerPiece * totalPieces;
  const depositAmount = totalNativePrice * (factoryDepositPct / 100);
  const balanceAmount = totalNativePrice * (1 - factoryDepositPct / 100);
  const dutyAmount = dutyCostPerPiece * totalPieces;
  const freightAmount = (shippingCostPerPiece + localHandlingPerPiece) * totalPieces;

  const getPaymentStatus = (eventDate, stageName) => {
    if (product.status === 'Warehouse') return 'Paid';
    if (stageName === 'Order Deposit') return 'Paid'; // Factory deposit paid when PO is confirmed
    const today = new Date().toISOString().split('T')[0];
    if (eventDate < today) return 'Paid';
    return 'Pending';
  };

  const orderDate = product.orderDate || new Date().toISOString().split('T')[0];
  const etaDate = product.transitEta || new Date().toISOString().split('T')[0];
  
  // Estimate departure date as ETA - 21 days if not specified
  const departureDate = product.departureDate || 
    (product.transitEta 
      ? new Date(new Date(product.transitEta).getTime() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]);

  const cashFlowSchedule = [
    {
      id: `${product.id || 'new'}_deposit`,
      sku: product.sku,
      name: product.name,
      description: `${factoryDepositPct}% Factory Deposit`,
      amount: depositAmount,
      date: orderDate,
      stage: 'Order Deposit',
      status: getPaymentStatus(orderDate, 'Order Deposit')
    },
    {
      id: `${product.id || 'new'}_balance`,
      sku: product.sku,
      name: product.name,
      description: `${100 - factoryDepositPct}% Factory Balance`,
      amount: balanceAmount,
      date: departureDate,
      stage: 'Shipment Departure',
      status: getPaymentStatus(departureDate, 'Shipment Departure')
    },
    {
      id: `${product.id || 'new'}_duty`,
      sku: product.sku,
      name: product.name,
      description: `Customs Duty (${dutyRatePct}%)`,
      amount: dutyAmount,
      date: etaDate,
      stage: 'Port Arrival',
      status: getPaymentStatus(etaDate, 'Port Arrival')
    },
    {
      id: `${product.id || 'new'}_freight`,
      sku: product.sku,
      name: product.name,
      description: `Freight & Handling Fees`,
      amount: freightAmount,
      date: etaDate,
      stage: 'Warehouse Delivery',
      status: getPaymentStatus(etaDate, 'Warehouse Delivery')
    }
  ];

  return {
    nativePricePerPiece,
    dutyCostPerPiece,
    shippingCostPerPiece,
    localHandlingPerPiece,
    landedCostPerPiece,
    
    totalPieces,
    cbmPerCarton,
    totalCbm,
    totalWeight,
    
    totalNativePrice,
    totalDutyCost: dutyCostPerPiece * totalPieces,
    totalShippingCost: shippingCostPerPiece * totalPieces,
    totalLocalHandling: localHandlingPerPiece * totalPieces,
    totalLandedCost: landedCostPerPiece * totalPieces,

    // Margin fields
    sellingPrice,
    profitPerPiece,
    marginPct,
    markupPct,
    totalRevenue: sellingPrice * totalPieces,
    totalProfit: profitPerPiece * totalPieces,

    // Tiered Prices
    sellingPriceTier1,
    sellingPriceTier2,
    sellingPriceTier3,
    tier1Profit,
    tier2Profit,
    tier3Profit,
    tier1MarginPct,
    tier2MarginPct,
    tier3MarginPct,

    // Cash flow schedule
    cashFlowSchedule
  };
}
