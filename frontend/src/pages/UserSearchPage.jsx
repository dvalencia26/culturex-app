import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { userService } from '../services/userService';
import SearchBar from '../components/ui/SearchBar';
import UserCard from '../components/ui/UserCard';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { Users, Search } from 'lucide-react';

/**
 * UserSearchPage Component:
 * Search page for finding users by name or username.
 * Features: search bar, grid results, load more pagination, URL sync.
 */

const LIMIT = 20;

const UserSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch users from API
  const fetchUsers = useCallback(async (query, newOffset = 0, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await userService.searchUsers(query, LIMIT, newOffset);
      
      if (result.success) {
        if (append) {
          setUsers(prev => [...prev, ...result.data.users]);
        } else {
          setUsers(result.data.users);
        }
        setTotalCount(result.data.total_count);
        setHasMore(result.data.has_more);
        setOffset(newOffset);
        setHasSearched(query.trim().length > 0);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Handle search from SearchBar
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setOffset(0);
    
    // Update URL params
    if (query.trim()) {
      setSearchParams({ q: query });
    } else {
      setSearchParams({});
    }
    
    fetchUsers(query, 0, false);
  }, [fetchUsers, setSearchParams]);

  // Handle "Load More" button
  const handleLoadMore = () => {
    const newOffset = offset + LIMIT;
    fetchUsers(searchQuery, newOffset, true);
  };

  // Initial load from URL params or fetch latest users
  useEffect(() => {
    const queryFromUrl = searchParams.get('q');
    if (queryFromUrl) {
      setSearchQuery(queryFromUrl);
      fetchUsers(queryFromUrl, 0, false);
    } else {
      // Fetch latest users on initial load
      fetchUsers('', 0, false);
    }
  }, []); // Only run on mount

  return (
    <div className="min-h-screen bg-[var(--color-background-snow)] font-ui">
      <div className="pt-8 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Find People' }
            ]}
          />

          {/* Header */}
          <div className="text-center mb-8 mt-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--primary-color-royal)] font-editorial">
                Explore Travelers Profiles
              </h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-10">
            <SearchBar
              value={searchQuery}
              onSearch={handleSearch}
              placeholder="Search by name or username..."
              loading={loading}
            />
          </div>

          {/* Results Section */}
          <div className="mt-8">
            {/* Results Count */}
            {!loading && users.length > 0 && (
              <p className="text-[var(--text-color-ink-400)] text-sm mb-6">
                {hasSearched 
                  ? (totalCount === 0 
                      ? `No results found for "${searchQuery}"`
                      : `Found ${totalCount} ${totalCount === 1 ? 'person' : 'people'}`
                    )
                  : `Showing ${totalCount} ${totalCount === 1 ? 'traveler' : 'travelers'}`
                }
              </p>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-[var(--primary-color-royal)] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* Empty State - No Search Yet */}
            {!hasSearched && !loading && users.length === 0 && (
              <div className="text-center py-16">
                <h3 className="text-xl font-semibold text-[var(--text-color-ink)] mb-2">
                  No Travelers Yet
                </h3>
                <p className="text-[var(--text-color-ink-400)] max-w-md mx-auto">
                  Be the first to join the community!
                </p>
              </div>
            )}

            {/* No Results State */}
            {hasSearched && !loading && users.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--color-background-snow)] border-2 border-[var(--border-color-line)] flex items-center justify-center">
                  <Users className="w-10 h-10 text-[var(--text-color-ink-400)]" />
                </div>
                <h3 className="text-xl font-semibold text-[var(--text-color-ink)] mb-2">
                  No People Found
                </h3>
                <p className="text-[var(--text-color-ink-400)] max-w-md mx-auto">
                  Try searching with a different name or username
                </p>
              </div>
            )}

            {/* Results Grid */}
            {!loading && users.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {users.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center mt-10">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-8 py-3 bg-[var(--primary-color-royal)] text-white font-semibold rounded-input hover:bg-[var(--primary-color-royal-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loadingMore ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSearchPage;
