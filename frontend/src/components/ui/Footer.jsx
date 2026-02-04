import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full bg-[var(--color-background-snow)] border-t border-[var(--border-color-line)] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-6 text-center md:text-left">
          {/* Column 1 - Brand */}
          <div className="space-y-3">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Compass className="w-5 h-5 text-[var(--primary-color-royal)]" strokeWidth={2.5} />
              <h3 className="text-xl font-bold text-[var(--primary-color-royal)] font-editorial">
                Our Routes
              </h3>
            </div>
            <p className="text-sm text-[var(--text-color-ink-400)] leading-relaxed max-w-sm mx-auto md:mx-0">
              A place to document journeys and learn from real travel experiences.
            </p>
          </div>

          {/* Column 2 - Explore */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[var(--text-color-ink)] font-editorial">
              Explore
            </h3>
            <nav className="flex flex-col space-y-2">
              <Link 
                to="/global-posts" 
                className="text-sm text-[var(--text-color-ink-400)] hover:text-[var(--primary-color-royal)] transition-colors duration-200"
              >
                Blogs
              </Link>
              <Link 
                to="/threads" 
                className="text-sm text-[var(--text-color-ink-400)] hover:text-[var(--primary-color-royal)] transition-colors duration-200"
              >
                Threads
              </Link>
              <Link 
                to="/countries" 
                className="text-sm text-[var(--text-color-ink-400)] hover:text-[var(--primary-color-royal)] transition-colors duration-200"
              >
                Destinations
              </Link>
            </nav>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-[var(--border-color-line)] text-center">
          <p className="text-xs text-[var(--text-color-ink-400)]">
            © {new Date().getFullYear()} Our Routes. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
