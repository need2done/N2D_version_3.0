import { motion } from 'framer-motion';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export default function SectionHeading({ title, subtitle, viewAllLink, onViewAll }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      {(viewAllLink || onViewAll) && (
        <motion.button
          whileHover={{ x: 3 }}
          onClick={onViewAll}
          className="flex items-center gap-1 text-brand-orange text-sm font-semibold hover:underline"
        >
          See all <ArrowForwardIcon style={{ fontSize: 16 }} />
        </motion.button>
      )}
    </div>
  );
}
