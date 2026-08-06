import { Link } from 'react-router-dom';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-2">
            <Link to="/" className="flex items-center">
              <img
                src="/logos/need2done.png"
                alt="Need2Done"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden items-center gap-1">
                <span className="font-display font-black text-xl">
                  <span className="text-brand-blue">Need</span>
                  <span className="text-brand-orange">2</span>
                  <span className="text-brand-blue">done</span>
                </span>
              </div>
            </Link>
            <p className="text-sm text-text-secondary leading-relaxed max-w-sm">
              Premium Food Customer Dashboard of Need2Done. Order from your favorite local restaurants in Bhongir and complete your order seamlessly on WhatsApp.
            </p>
            {/* Social Icons */}
            <div className="flex gap-4">
              <a
                href="https://wa.me/917989862623"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary hover:bg-green-500 hover:text-white transition-all duration-200"
              >
                <WhatsAppIcon style={{ fontSize: 18 }} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary hover:bg-pink-500 hover:text-white transition-all duration-200"
              >
                <InstagramIcon style={{ fontSize: 18 }} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary hover:bg-blue-600 hover:text-white transition-all duration-200"
              >
                <FacebookIcon style={{ fontSize: 18 }} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-text-secondary hover:bg-brand-blue hover:text-white transition-all duration-200"
              >
                <LinkedInIcon style={{ fontSize: 18 }} />
              </a>
            </div>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-display font-bold text-sm text-text-primary mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <Link to="/privacy-policy" className="hover:text-brand-orange transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="hover:text-brand-orange transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-brand-orange transition-colors">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Info */}
          <div>
            <h4 className="font-display font-bold text-sm text-text-primary mb-4">Contact & Support</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>
                <a
                  href="https://wa.me/917989862623"
                  className="hover:text-brand-orange transition-colors flex items-center gap-1.5"
                >
                  <WhatsAppIcon style={{ fontSize: 16 }} />
                  WhatsApp Support
                </a>
              </li>
              <li>Email: support@need2done.com</li>
              <li>Phone: +91 79898 62623</li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-gray-100 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted">
          <p>© {new Date().getFullYear()} Need2Done. All rights reserved.</p>
          <p>Made for Bhongir, Telangana</p>
        </div>
      </div>
    </footer>
  );
}
