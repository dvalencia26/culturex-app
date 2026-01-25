import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Home, ChevronRight} from 'lucide-react';
import { decodeSlug } from '../../utils/countryUtils';

/**
 * Breadcrumbs Component: Displays the current page's location within the site hierarchy
 * Uses declarative route matcher pattern for maintainability
 */

// Convert slug to title. Example: "my-awesome-post" to "My Awesome Post"
// Also decodes URL-encoded characters like %C3%AD → í
const formatSlugToTitle = (slug) => {
  if (!slug) return '';
  
  // Decode URL encoding first
  const decoded = decodeSlug(slug);
  
  return decoded
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Route Configuration Array
 * More specific patterns first, general patterns last
 * Each config has: pattern (regex) and generate (function returning breadcrumb array)
 */
const routeConfig = [
  // Post Edit Page
  {
    pattern: /^\/u\/[^\/]+\/posts\/([^\/]+)\/edit$/,
    generate: (match, pathname, params, context = {}) => {
      const slug = match[1];
      const title = formatSlugToTitle(slug);
      const { countryCode, locationScope } = context;
      
      // If post has country, show country breadcrumbs
      if (countryCode && (locationScope === 'country' || locationScope === 'city')) {
        return [
          { label: 'Home', path: '/', icon: Home },
          { label: 'Countries', path: '/countries'},
          { label: countryCode.toUpperCase(), path: `/countries/${countryCode.toLowerCase()}` },
          { label: title, path: null },
          { label: 'Edit', path: null }
        ];
      }
      
      // Default to global posts
      return [
        { label: 'Home', path: '/', icon: Home },
        { label: 'Global Posts', path: '/global-posts'},
        { label: title, path: null },
        { label: 'Edit', path: null }
      ];
    }
  },

  // Post Detail Page
  {
    pattern: /^\/u\/[^\/]+\/posts\/([^\/]+)$/,
    generate: (match, pathname, params, context = {}) => {
      const slug = match[1];
      const title = formatSlugToTitle(slug);
      const { countryCode, locationScope } = context;
      
      // If post has country, show country breadcrumbs
      if (countryCode && (locationScope === 'country' || locationScope === 'city')) {
        return [
          { label: 'Home', path: '/', icon: Home },
          { label: 'Countries', path: '/countries'},
          { label: countryCode.toUpperCase(), path: `/countries/${countryCode.toLowerCase()}` },
          { label: title, path: null}
        ];
      }
      
      // Default to global posts
      return [
        { label: 'Home', path: '/', icon: Home },
        { label: 'Global Posts', path: '/global-posts'},
        { label: title, path: null}
      ];
    }
  },

  // Thread Edit Page
  {
    pattern: /^\/u\/[^\/]+\/threads\/([^\/]+)\/edit\/?$/,
    generate: (match) => {
      const slug = match[1];
      const title = formatSlugToTitle(slug);
      return [
        { label: 'Home', path: '/', icon: Home },
        { label: 'Discussions', path: '/threads' },
        { label: title, path: null },
        { label: 'Edit', path: null }
      ];
    }
  },

  // Thread Detail Page
  {
    pattern: /^\/u\/[^\/]+\/threads\/([^\/]+)\/?$/,
    generate: (match) => {
      const slug = match[1];
      const title = formatSlugToTitle(slug);
      return [
        { label: 'Home', path: '/', icon: Home },
        { label: 'Discussions', path: '/threads'},
        { label: title, path: null }
      ];
    }
  },

  // Country Threads Page
  {
    pattern: /^\/countries\/([a-zA-Z]{2})\/threads$/,
    generate: (match) => {
      const countryCode = match[1].toUpperCase();
      return [
        { label: 'Home', path: '/', icon: Home },
        { label: 'Countries', path: '/countries'},
        { label: countryCode, path: `/countries/${countryCode.toLowerCase()}` },
        { label: 'Discussions', path: null}
      ];
    }
  },

  // City Page
  {
    pattern: /^\/countries\/([a-zA-Z]{2})\/([^\/]+)$/,
    generate: (match) => {
      const countryCode = match[1].toUpperCase();
      const citySlug = match[2];
      const cityName = formatSlugToTitle(citySlug);
      return [
        { label: 'Home', path: '/', icon: Home },
        { label: 'Countries', path: '/countries' },
        { label: countryCode, path: `/countries/${countryCode.toLowerCase()}` },
        { label: cityName, path: null }
      ];
    }
  },

  // Country Page
  {
    pattern: /^\/countries\/([a-zA-Z]{2})$/,
    generate: (match) => {
      const countryCode = match[1].toUpperCase();
      return [
        { label: 'Home', path: '/', icon: Home },
        { label: 'Countries', path: '/countries'},
        { label: countryCode, path: null }
      ];
    }
  },

  // Countries List Page
  {
    pattern: /^\/countries$/,
    generate: () => [
      { label: 'Home', path: '/', icon: Home },
      { label: 'Countries', path: null}
    ]
  },

  // Threads List Page
  {
    pattern: /^\/threads$/,
    generate: () => [
      { label: 'Home', path: '/', icon: Home },
      { label: 'Discussions', path: null}
    ]
  },

  // Global Posts Page
  {
    pattern: /^\/global-posts$/,
    generate: () => [
      { label: 'Home', path: '/', icon: Home },
      { label: 'Global Posts', path: null}
    ]
  },

  // Profile Page
  {
    pattern: /^\/profile\/([^\/]+)$/,
    generate: (match) => {
      const username = match[1];
      return [
        { label: 'Home', path: '/', icon: Home },
        { label: `@${username}`, path: null}
      ];
    }
  },

  // Create Post Page
  {
    pattern: /^\/create-post$/,
    generate: () => [
      { label: 'Home', path: '/', icon: Home },
      { label: 'Create Post', path: null}
    ]
  },

  // Create Thread Page
  {
    pattern: /^\/create-thread$|^\/threads\/create$/,
    generate: () => [
      { label: 'Home', path: '/', icon: Home },
      { label: 'Create Discussion', path: null}
    ]
  },
  
  // Update Profile Page
  {
    pattern: /^\/settings\/profile$/,
    generate: () => [
      { label: 'Home', path: '/', icon: Home },
      { label: 'Settings', path: '/settings' },
      { label: 'Update Profile', path: null}
    ]
  }
];

// Splits path and creates basic breadcrumbs (Fallback)
const getDefaultBreadcrumbs = (pathname) => {
  const paths = pathname.split('/').filter(Boolean);
  const crumbs = [{ label: 'Home', path: '/', icon: Home }];
  
  paths.forEach((segment, index) => {
    const path = '/' + paths.slice(0, index + 1).join('/');
    const label = formatSlugToTitle(segment);
    const isLast = index === paths.length - 1;
    crumbs.push({
      label,
      path: isLast ? null : path,
      icon: null
    });
  });
  
  return crumbs;
};

const Breadcrumbs = ({ post = null }) => {
  const location = useLocation();
  const params = useParams();
  const pathname = location.pathname;

  // Get country info from location state (navigation) or post prop (page refresh/direct link)
  const locationState = location.state || {};
  const countryCode = locationState.countryCode || post?.country_code;
  const countryName = locationState.countryName || post?.country_name;
  const cityName = locationState.cityName || post?.city_name;
  const locationScope = post?.location_scope;

  /**
   * Generate breadcrumb items based on current URL pattern
   * Loops through route config, finds first match, calls its generator
   */
  const getBreadcrumbs = () => {
    for (const route of routeConfig) {
      const match = pathname.match(route.pattern);
      if (match) {
        const result = route.generate(match, pathname, params, { countryCode, countryName, cityName, locationScope });
        // If generator returns null, continue to next pattern
        if (result !== null) {
          return result;
        }
      }
    }
    // Fallback for unmatched routes
    return getDefaultBreadcrumbs(pathname);
  };

  const breadcrumbs = getBreadcrumbs();

  // Don't render breadcrumbs on home page
  if (pathname === '/') {
    return null;
  }

  return (
    <nav className="text-sm" aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-1">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const Icon = crumb.icon;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 mx-2 text-[var(--text-color-ink-400)]" />
              )}
              
              {crumb.path && !isLast ? (
                <Link
                  to={crumb.path}
                  className="flex items-center gap-1 text-[var(--primary-color-royal)] hover:text-[var(--primary-color-royal-600)] hover:underline font-medium transition-colors"
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {crumb.label}
                </Link>
              ) : (
                <span className="flex items-center gap-1 text-[var(--text-color-ink-400)] font-medium">
                  {Icon && <Icon className="w-4 h-4" />}
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;


