import { motion } from 'framer-motion';
import RestaurantCard from '../restaurant/RestaurantCard';
import { SkeletonRestaurantCard } from '../ui/SkeletonCard';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function RestaurantGrid({ restaurants, loading = false, columns = 3 }) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[columns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  if (loading) {
    return (
      <div className={`grid ${gridCols} gap-5`}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonRestaurantCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-50px' }}
      className={`grid ${gridCols} gap-5`}
    >
      {restaurants.map((r) => (
        <motion.div key={r.id} variants={cardVariants}>
          <RestaurantCard restaurant={r} />
        </motion.div>
      ))}
    </motion.div>
  );
}
