import React from 'react';
import { Mail } from '../../icons/lucideIcons';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';

const LandingFooter = () => {
  return (
    <footer className="bg-surface-container-lowest border-t border-outline-variant/10 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-xl mb-20">
          <div className="col-span-1 md:col-span-1">
            <div className="font-headline-md text-headline-md font-bold text-on-surface mb-md">Entrack</div>
            <p className="text-on-surface-variant text-body-sm mb-lg">
              The ultimate high-performance trading journal and replay platform. Built by traders, for traders who
              want to master their edge.
            </p>
            <div className="flex gap-md">
              <a className="text-on-surface-variant hover:text-primary transition-colors" href="#" aria-label="Facebook">
                <FacebookIcon sx={{ fontSize: 20 }} />
              </a>
              <a className="text-on-surface-variant hover:text-primary transition-colors" href="#" aria-label="Instagram">
                <InstagramIcon sx={{ fontSize: 20 }} />
              </a>
              <a className="text-on-surface-variant hover:text-primary transition-colors" href="#" aria-label="X (Twitter)">
                <TwitterIcon sx={{ fontSize: 20 }} />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-label-caps text-label-caps text-on-surface mb-lg uppercase tracking-widest">
              Product
            </h4>
            <ul className="space-y-md text-body-sm text-on-surface-variant">
              <li>
                <a className="hover:text-primary transition-colors" href="#features">
                  Features
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#replay">
                  Replay Mode
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#analytics">
                  Analytics
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#pricing">
                  Pricing
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-label-caps text-label-caps text-on-surface mb-lg uppercase tracking-widest">
              Support
            </h4>
            <ul className="space-y-md text-body-sm text-on-surface-variant">
              <li>
                <a className="hover:text-primary transition-colors flex items-center gap-2" href="mailto:support@entrack.in">
                  <Mail size={14} /> support@entrack.in
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">
                  Help Center
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">
                  Documentation
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">
                  Changelog
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-label-caps text-label-caps text-on-surface mb-lg uppercase tracking-widest">Legal</h4>
            <ul className="space-y-md text-body-sm text-on-surface-variant">
              <li>
                <a className="hover:text-primary transition-colors" href="#">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">
                  Terms of Service
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">
                  Risk Disclosure
                </a>
              </li>
              <li>
                <a className="hover:text-primary transition-colors" href="#">
                  Refund Policy
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-10 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-md">
          <p className="text-body-sm text-on-surface-variant">© 2024 Entrack Trading Solutions. All rights reserved.</p>
          <p className="text-body-sm text-on-surface-variant opacity-60 text-center md:text-right">
            Trading involves significant risk. Past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
