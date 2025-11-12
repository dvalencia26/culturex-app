import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

// Breadcrumbs Component: Displays the current page's location within the site hierarchy
/* Notes: Fixed name display of cities like "Sao Paulo" to display correctly.
Fixed no page found when clicking on country code in breadcrumbs.
 */

const Breadcrumbs = () => {
  const location = useLocation();
  const params = useParams();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Helper function to format display names
  const getDisplayName = (value, index) => {
    // Handle "countries" segment - show as "Countries"
    if (value === 'countries') {
      return 'Countries';
    }
    
    // Handle country code (2 letters after /countries/)
    if (pathnames[index - 1] === 'countries' && value.length === 2) {
      return value.toUpperCase(); // Country code in uppercase
    }
    
    // Handle city slugs (after country code)
    if (index === 2 && pathnames[0] === 'countries') {
      return value.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    
    // Default: capitalize and replace hyphens
    return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
  };

  return (
    <nav className="text-sm" aria-label="Breadcrumb">
      <ul className="flex items-center flex-wrap">
        <li>
          <Link 
            to="/" 
            className="text-[var(--primary-color-royal)] hover:underline font-medium"
          >
            Home
          </Link>
        </li>
        
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const displayName = getDisplayName(value, index);
          
          return (
            <li key={to} className="flex items-center">
              <span className="mx-2 text-gray-400">/</span>
              {isLast ? (
                <span className="text-gray-600 font-medium">
                  {displayName}
                </span>
              ) : (
                <Link 
                  to={to} 
                  className="text-[var(--primary-color-royal)] hover:underline font-medium"
                >
                  {displayName}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Breadcrumbs;
