import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining';
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic';

const TRUST_ITEMS = [
  { icon: VerifiedUserIcon, title: 'SAFE & SECURE', sub: '100% safe payments', color: 'text-brand-blue' },
  { icon: LocalOfferIcon, title: 'BEST OFFERS', sub: 'Exciting offers every day', color: 'text-brand-orange' },
  { icon: DeliveryDiningIcon, title: 'FAST DELIVERY', sub: 'On-time delivery', color: 'text-brand-green' },
  { icon: HeadsetMicIcon, title: 'CUSTOMER SUPPORT', sub: 'We are here to help', color: 'text-purple-600' },
];

export default function TrustBar() {
  return (
    <div className="border-t border-gray-100 pt-4 mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
      {TRUST_ITEMS.map(({ icon: Icon, title, sub, color }) => (
        <div key={title} className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon style={{ fontSize: 20 }} />
          </div>
          <div>
            <p className="text-[10px] font-black text-text-primary tracking-wide">{title}</p>
            <p className="text-[9px] text-gray-400">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
