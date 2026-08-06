// Skeleton loading card
export function SkeletonRestaurantCard() {
  return (
    <div className="card rounded-2xl overflow-hidden animate-pulse">
      <div className="shimmer h-44 w-full" />
      <div className="p-4 space-y-3">
        <div className="shimmer h-5 w-3/4 rounded-lg" />
        <div className="shimmer h-4 w-1/2 rounded-lg" />
        <div className="flex gap-2">
          <div className="shimmer h-4 w-16 rounded-full" />
          <div className="shimmer h-4 w-16 rounded-full" />
        </div>
        <div className="shimmer h-8 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonFoodCard() {
  return (
    <div className="card rounded-2xl overflow-hidden animate-pulse flex gap-4 p-4">
      <div className="flex-1 space-y-2">
        <div className="shimmer h-5 w-3/4 rounded-lg" />
        <div className="shimmer h-4 w-full rounded-lg" />
        <div className="shimmer h-4 w-1/2 rounded-lg" />
        <div className="shimmer h-6 w-24 rounded-lg" />
      </div>
      <div className="shimmer w-28 h-28 rounded-xl flex-shrink-0" />
    </div>
  );
}

export function SkeletonBanner() {
  return (
    <div className="shimmer w-full h-72 md:h-96 rounded-3xl animate-pulse" />
  );
}

export function SkeletonCategory() {
  return (
    <div className="flex flex-col items-center gap-2 animate-pulse">
      <div className="shimmer w-20 h-20 rounded-2xl" />
      <div className="shimmer h-3 w-14 rounded-full" />
    </div>
  );
}
