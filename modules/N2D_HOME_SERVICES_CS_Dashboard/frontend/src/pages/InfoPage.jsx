import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

const InfoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const contentMap = {
    'about': {
      title: 'About Us',
      content: (
        <>
          <p className="mb-4">Welcome to Need2Done, your trusted partner for professional home services. We connect you with verified, highly-trained experts who deliver top-quality services directly to your doorstep.</p>
          <p className="mb-4">Founded with the mission to organize the home services industry, we ensure that every professional on our platform undergoes strict background checks and extensive training.</p>
          <p>Our vision is to empower millions of service professionals worldwide to deliver services at home like never experienced before.</p>
        </>
      )
    },
    'terms': {
      title: 'Terms & Conditions',
      content: (
        <>
          <h3 className="text-xl font-bold mb-2">1. Acceptance of Terms</h3>
          <p className="mb-4">By accessing or using Need2Done, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access our service.</p>
          <h3 className="text-xl font-bold mb-2">2. Service Provision</h3>
          <p className="mb-4">We act as an aggregator connecting you with independent professionals. We are not a traditional service provider but facilitate the booking process.</p>
          <h3 className="text-xl font-bold mb-2">3. Payments</h3>
          <p>Payments are handled securely. No advance payment is strictly required for most services until the job is completed to your satisfaction.</p>
        </>
      )
    },
    'privacy': {
      title: 'Privacy Policy',
      content: (
        <>
          <p className="mb-4">At Need2Done, we take your privacy seriously. We only collect the necessary personal data required to provide our home services efficiently, such as your location and contact details.</p>
          <p className="mb-4">We do not sell, trade, or rent users' personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification.</p>
          <p>Your data is secured using industry-standard encryption protocols during transmission and storage.</p>
        </>
      )
    },
    'contact': {
      title: 'Contact Us',
      content: (
        <>
          <p className="mb-4">We're here to help you 24/7! Feel free to reach out to us through any of the following channels:</p>
          <ul className="list-disc pl-5 space-y-2 mb-6">
            <li><strong>Email:</strong> support@need2done.com</li>
            <li><strong>WhatsApp/Phone:</strong> +91 7989862623</li>
            <li><strong>Address:</strong> Need2Done Headquarters, Tech Park, Hyderabad, Telangana, India.</li>
          </ul>
          <p>Or simply click the WhatsApp button in the footer for an immediate response from our support team!</p>
        </>
      )
    },
    'support': {
      title: 'Customer Support',
      content: (
        <>
          <p className="mb-4">Having an issue with your booking or a service professional? Our dedicated support team is ready to assist you.</p>
          <p className="mb-4">Please keep your WhatsApp Session ID ready for faster resolution. You can reach our support team directly via WhatsApp or by calling our toll-free support line at +91 7989862623.</p>
          <p>Our typical response time is under 5 minutes during working hours.</p>
        </>
      )
    },
    'faq': {
      title: 'Frequently Asked Questions',
      content: (
        <>
          <h3 className="text-xl font-bold mb-2">How do I book a service?</h3>
          <p className="mb-4">Simply navigate to the service you need, select your duration, date, and address, and click "Book via WhatsApp".</p>
          <h3 className="text-xl font-bold mb-2">Are the professionals verified?</h3>
          <p className="mb-4">Yes! Every professional undergoes a strict background check, identity verification, and skill training.</p>
          <h3 className="text-xl font-bold mb-2">What if I'm not satisfied with the service?</h3>
          <p>We offer a 100% satisfaction guarantee. If you are not happy, please contact support and we will arrange a free rework.</p>
        </>
      )
    },
    'safety': {
      title: 'Safety Guidelines',
      content: (
        <>
          <p className="mb-4">Your safety and the safety of our professionals is our top priority.</p>
          <ul className="list-disc pl-5 space-y-2 mb-6">
            <li>All professionals are equipped with standardized safety gear including masks and gloves.</li>
            <li>Daily temperature checks are mandated for all our field experts.</li>
            <li>We request you to maintain a safe distance while the service is being performed.</li>
            <li>Digital payment methods are highly encouraged to minimize physical contact.</li>
          </ul>
        </>
      )
    }
  };

  const pageData = contentMap[id];

  if (!pageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <h2 className="text-3xl font-black text-gray-900 mb-4">Page Not Found</h2>
        <p className="text-gray-500 mb-8">The page you are looking for does not exist.</p>
        <button onClick={() => navigate(-1)} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-gray-500 hover:text-blue-600 mb-8 transition-colors">
          <FaArrowLeft className="mr-2" /> Back
        </button>
        
        <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100">
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-8 tracking-tight border-b border-gray-100 pb-6">
            {pageData.title}
          </h1>
          
          <div className="prose prose-lg prose-blue max-w-none text-gray-600">
            {pageData.content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoPage;
