/**
 
 *
 * Base fare  : KES 50  (covers rider pickup / minimum trip)
 * Per km     : KES 25  (up to 5 km)
 * Per km     : KES 20  (5–15 km)
 * Per km     : KES 15  (above 15 km — long-haul discount)
 * Minimum    : KES 80
 * Maximum    : KES 800 (within Nairobi metro)
 *
 * Platform takes 10 % of the gross delivery fee.
 * Rider receives 90 %.
 */

const BASE_FARE  = 50;
const RATE_NEAR  = 25;   // per km, 0–5 km
const RATE_MID   = 20;   // per km, 5–15 km
const RATE_FAR   = 15;   // per km, >15 km
const MIN_FEE    = 80;
const MAX_FEE    = 800;
const PLATFORM_COMMISSION = 0.10;   // 10 %

/**
 * Haversine great-circle distance between two lat/lng points.
 * @returns distance in kilometres
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate gross delivery fee for a given distance.
 * @param {number} distanceKm
 * @returns {number} fee in KES (integer)
 */
function calcDeliveryFee(distanceKm) {
  let fee = BASE_FARE;

  if (distanceKm <= 5) {
    fee += distanceKm * RATE_NEAR;
  } else if (distanceKm <= 15) {
    fee += 5 * RATE_NEAR + (distanceKm - 5) * RATE_MID;
  } else {
    fee += 5 * RATE_NEAR + 10 * RATE_MID + (distanceKm - 15) * RATE_FAR;
  }

  fee = Math.max(MIN_FEE, Math.min(MAX_FEE, fee));
  return Math.round(fee);
}

/**
 * Full breakdown: gross fee, platform cut, rider net.
 */
function deliveryFeeBreakdown(distanceKm) {
  const gross      = calcDeliveryFee(distanceKm);
  const platform   = Math.round(gross * PLATFORM_COMMISSION);
  const riderNet   = gross - platform;
  return { gross, platform, riderNet, distanceKm: Math.round(distanceKm * 100) / 100 };
}

/**
 * Vendor earnings breakdown for a sale.
 * Platform takes 10 % of listing price × quantity.
 */
function vendorEarningsBreakdown(listingPrice, quantity) {
  const gross    = listingPrice * quantity;
  const platform = Math.round(gross * PLATFORM_COMMISSION);
  const vendorNet = gross - platform;
  return { gross, platform, vendorNet };
}

module.exports = {
  haversineKm,
  calcDeliveryFee,
  deliveryFeeBreakdown,
  vendorEarningsBreakdown,
  PLATFORM_COMMISSION,
};
