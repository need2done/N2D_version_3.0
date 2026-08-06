import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-brand-orange transition-colors"
      >
        <ArrowBackIcon style={{ fontSize: 16 }} />
        Back to Home
      </button>

      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-card border border-gray-100 space-y-6">
        <h1 className="font-display font-black text-3xl md:text-4xl text-text-primary">Privacy Policy</h1>
        <p className="text-text-muted text-xs">Last updated: July 5, 2026</p>
        
        <div className="border-b border-gray-100 my-6" />

        <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <p>
            At <strong>Need2Done</strong>, accessible from our customer dashboard, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Need2Done and how we use it.
          </p>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">1. Information We Collect</h2>
          <p>
            Since Need2Done Food Customer Dashboard does not require login, we minimize data collection to the absolute necessary details to handle your orders. When you proceed with ordering:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>We do not request username, email, or passwords on our customer dashboard.</li>
            <li>We store your cart selections locally on your device (using browser LocalStorage) so that your order persists.</li>
            <li>When you click to complete your order on WhatsApp, we compile your order details (Order ID, items, and total prices) to send to the Need2Done WhatsApp chatbot.</li>
            <li>On WhatsApp, the chatbot will ask you to share your delivery location and payment choices. This information is processed securely for order fulfillment and delivery only.</li>
          </ul>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">2. How We Use Your Information</h2>
          <p>
            We use the compiled order details exclusively to:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Process, prepare, and deliver your food orders.</li>
            <li>Coordinate with the partner restaurants in Bhongir.</li>
            <li>Provide support and order status updates via WhatsApp.</li>
            <li>Process payment confirmations (via Razorpay API or cash on delivery coordination).</li>
          </ul>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">3. Local Storage</h2>
          <p>
            We use local storage (LocalStorage) on your web browser to persist your cart item details, customized options, and selected restaurant. This allows you to browse the menu without losing your cart contents. You can clear this data at any time by clearing your browser cache or manually clearing your cart.
          </p>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">4. Third-Party Services</h2>
          <p>
            We do not sell, trade, or share your data with third parties except as necessary to fulfill your order (e.g., sharing the order item details with the restaurant and delivering your order through riders). Payment transactions simulated or initiated are secure through our payment gateway provider (Razorpay).
          </p>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">5. Contact Us</h2>
          <p>
            If you have any questions about our Privacy Policy or data processing, feel free to reach out to us at:
          </p>
          <p className="font-semibold text-brand-orange">Email: support@need2done.com | WhatsApp: +91 79898 62623</p>
        </div>
      </div>
    </div>
  );
}
