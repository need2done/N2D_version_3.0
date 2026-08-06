import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function Terms() {
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
        <h1 className="font-display font-black text-3xl md:text-4xl text-text-primary">Terms & Conditions</h1>
        <p className="text-text-muted text-xs">Last updated: July 5, 2026</p>
        
        <div className="border-b border-gray-100 my-6" />

        <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <p>
            Welcome to the <strong>Need2Done Food Customer Dashboard</strong>. By using this dashboard to browse menus and initiate orders, you agree to comply with and be bound by the following terms and conditions of use.
          </p>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">1. Use of Dashboard</h2>
          <p>
            This dashboard is an online menu catalog that compiles your food items into a digital cart and generates a unique Order ID. You can then submit your order details directly to our secure WhatsApp bot.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>No registration or customer log-in is required on this website.</li>
            <li>We do not collect personal identifiers, addresses, or phone numbers on this website.</li>
            <li>By using the website, you confirm you are ordering from within the serviceable areas of Bhongir, Telangana.</li>
          </ul>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">2. Ordering and WhatsApp Flow</h2>
          <p>
            All ordering flows are finalized on WhatsApp.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>The Cart checkout button redirects you to WhatsApp by compiling a text template of your items.</li>
            <li>You will communicate with the Need2Done automated chatbot (Chitti) to share your precise delivery location.</li>
            <li>Orders are only confirmed once the chatbot completes the confirmation step.</li>
          </ul>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">3. Business Rules</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>One Restaurant Only:</strong> You may only order from a single restaurant at a time. To add items from another restaurant, you must clear your current cart.
            </li>
            <li>
              <strong>Out of Stock Items:</strong> While we try to sync item availability live, some items may be sold out. Adding these items will be disabled.
            </li>
            <li>
              <strong>Cash on Delivery (COD):</strong> COD is strictly allowed only when the order grand total is equal to or greater than ₹100. For orders under ₹100, the chatbot will prompt online payment via Razorpay.
            </li>
          </ul>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">4. Payments</h2>
          <p>
            Online payments are securely processed through Razorpay via links sent in the WhatsApp chat. Need2Done does not store card numbers, UPI credentials, or online banking details.
          </p>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">5. Modifications to Service</h2>
          <p>
            Need2Done reserves the right to modify prices, menus, delivery fees, and platform charges at any time without prior notice.
          </p>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">6. Contact</h2>
          <p>
            For any queries or concerns regarding these Terms, please contact our support team:
          </p>
          <p className="font-semibold text-brand-orange">WhatsApp: +91 79898 62623 | Email: support@need2done.com</p>
        </div>
      </div>
    </div>
  );
}
