import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function RefundPolicy() {
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
        <h1 className="font-display font-black text-3xl md:text-4xl text-text-primary">Refund & Cancellation Policy</h1>
        <p className="text-text-muted text-xs">Last updated: July 5, 2026</p>
        
        <div className="border-b border-gray-100 my-6" />

        <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <p>
            At <strong>Need2Done</strong>, we aim to ensure complete customer satisfaction with our food delivery service. Since we coordinate with fresh food preparation partners in Bhongir, we have established the following refund and cancellation policies.
          </p>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">1. Order Cancellation</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Before Confirmation:</strong> You can cancel or edit your order immediately through the WhatsApp bot chat before the restaurant confirms it.
            </li>
            <li>
              <strong>After Confirmation:</strong> Once a restaurant accepts your order and begins food preparation, cancellations are not permitted, and no refunds will be issued for paid orders.
            </li>
          </ul>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">2. Refunds Eligibility</h2>
          <p>
            You may be eligible for a full or partial refund under the following circumstances:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>The selected restaurant is unable to fulfill your order due to item unavailability or closure.</li>
            <li>The order is cancelled by Need2Done due to extreme weather or delivery agent unavailability.</li>
            <li>The wrong items were delivered, or items were missing from your package (verified via order receipt and photo confirmation on WhatsApp).</li>
          </ul>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">3. Non-Refundable Scenarios</h2>
          <p>
            Refunds will not be issued in cases where:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>An incorrect delivery address was provided during the WhatsApp bot location setup.</li>
            <li>The customer is unreachable by the delivery rider at the time of delivery.</li>
            <li>Customer decides they no longer want the food after it has been prepared.</li>
          </ul>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">4. Refund Processing</h2>
          <p>
            For approved refunds on online payments (Razorpay), the amount will be processed and credited back to your original payment method within 5-7 business days, depending on your bank's policies.
          </p>

          <h2 className="font-display font-bold text-lg text-text-primary pt-4">5. Contact Support</h2>
          <p>
            To request a refund or raise a dispute regarding an active or completed order, please contact our support team on WhatsApp immediately with your <strong>Order ID</strong>.
          </p>
          <p className="font-semibold text-brand-orange">WhatsApp Support: +91 79898 62623 | Available 7:00 AM - 11:30 PM</p>
        </div>
      </div>
    </div>
  );
}
