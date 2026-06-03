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
    
    totalNativePrice: nativePricePerPiece * totalPieces,
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
    totalProfit: profitPerPiece * totalPieces
  };
}
