import { useState } from 'react';
import HeroBanner from '../components/home/HeroBanner';
import CategoryCarousel from '../components/home/CategoryCarousel';
import RestaurantGrid from '../components/home/RestaurantGrid';
import SectionHeading from '../components/home/SectionHeading';
import {
  restaurants,
  getPopularRestaurants,
  getFastDeliveryRestaurants,
  getTopRatedRestaurants,
  getRecommendedRestaurants,
  getRecentlyAddedRestaurants,
  getFeaturedBakery,
} from '../data/restaurants';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const popular = getPopularRestaurants();
  const fastDelivery = getFastDeliveryRestaurants();
  const topRated = getTopRatedRestaurants();
  const recommended = getRecommendedRestaurants();
  const recentlyAdded = getRecentlyAddedRestaurants();
  const featuredBakery = getFeaturedBakery();

  // Filter all restaurants if category is selected
  const displayRestaurants = selectedCategory
    ? restaurants.filter((r) =>
        r.cuisine.some((c) => c.toLowerCase().includes(selectedCategory.toLowerCase()))
      )
    : null;

  return (
    <div className="space-y-10 py-6">
      {/* 1. Hero Banner */}
      <HeroBanner />

      {/* 2. Food Categories */}
      <CategoryCarousel onSelect={setSelectedCategory} />

      {/* Conditional View for Filtered Category */}
      {selectedCategory ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading
            title={`Restaurants serving ${selectedCategory}`}
            subtitle={`Found ${displayRestaurants.length} matching restaurants`}
          />
          {displayRestaurants.length > 0 ? (
            <RestaurantGrid restaurants={displayRestaurants} columns={3} />
          ) : (
            <div className="text-center py-12">
              <p className="text-text-secondary text-sm">No restaurants found serving {selectedCategory} right now.</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 3. Today's Offers Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeading title="Today's Top Offers" subtitle="Special deals tailored for you today" />
            <RestaurantGrid
              restaurants={restaurants.filter((r) => r.offer !== '').slice(0, 3)}
              columns={3}
            />
          </div>

          {/* 4. Popular Restaurants */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeading title="Popular Restaurants" subtitle="Most loved food spots in Bhongir" />
            <RestaurantGrid restaurants={popular} columns={3} />
          </div>

          {/* 5. Fast Delivery */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeading title="Fast Delivery" subtitle="Super fast delivery right to your doorstep" />
            <RestaurantGrid restaurants={fastDelivery} columns={3} />
          </div>

          {/* 6. Top Rated */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeading title="Top Rated" subtitle="Highly recommended by your neighbors" />
            <RestaurantGrid restaurants={topRated} columns={3} />
          </div>

          {/* 7. Recommended Restaurants */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeading title="Recommended for You" subtitle="Handpicked choices based on quality" />
            <RestaurantGrid restaurants={recommended} columns={3} />
          </div>

          {/* Recently Added Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionHeading title="Recently Added" subtitle="New tastes and partners freshly arrived in Bhongir" />
            <RestaurantGrid restaurants={recentlyAdded} columns={3} />
          </div>

          {/* 8. Featured Bakery */}
          {featuredBakery && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-6 md:p-10 border border-amber-100 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 space-y-4">
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full">
                  🧁 Featured Bakery
                </span>
                <h3 className="font-display font-black text-2xl md:text-3xl text-text-primary leading-tight">
                  Taste Bengaluru's Iconic Bakery Culture — {featuredBakery.name}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Freshly baked croissants, premium pastries, artisan loafs, and traditional cookies delivered direct to you.
                </p>
                <div className="flex gap-4 items-center">
                  <div className="text-center">
                    <p className="font-bold text-lg text-text-primary">{featuredBakery.rating} ★</p>
                    <p className="text-[10px] text-text-muted">Rating</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="text-center">
                    <p className="font-bold text-lg text-text-primary">{featuredBakery.deliveryTime}m</p>
                    <p className="text-[10px] text-text-muted">Delivery</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="text-center">
                    <p className="font-bold text-lg text-text-primary">₹{featuredBakery.priceForTwo}</p>
                    <p className="text-[10px] text-text-muted">Price for Two</p>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-80 h-48 rounded-2xl overflow-hidden shadow-lg border-2 border-white">
                <img
                  src={featuredBakery.cover}
                  alt={featuredBakery.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
