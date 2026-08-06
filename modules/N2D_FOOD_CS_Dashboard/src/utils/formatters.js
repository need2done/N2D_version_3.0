export const formatPrice = (price) => `₹${price}`;

export const formatRating = (rating) => rating.toFixed(1);

export const formatReviews = (count) => {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};

export const formatDeliveryTime = (time) => `${time} mins`;

export const getDiscountPercent = (original, offer) => {
  if (!offer) return null;
  return Math.round(((original - offer) / original) * 100);
};
