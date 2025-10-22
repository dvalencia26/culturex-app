import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import Loader from './Loader';

const Profile = () => {
  const { user, logout } = useAuth();
  const { handle } = useParams(); // Get handle from URL using react-router
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Individual state variables for better control for profile data that may change: follow status, and counts
  const [isOurProfile, setIsOurProfile] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Determine if this profile belongs to the logged-in user 
  const profileIdentifier = handle;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileIdentifier) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await userService.getUserProfile(profileIdentifier);
        if (result.success) {
          setProfile(result.data);
          // Set individual state variables
          setIsOurProfile(result.data.is_our_profile);
          setFollowing(result.data.following);
          setFollowerCount(result.data.followers_count || 0);
          setFollowingCount(result.data.following_count || 0);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Failed to load profile');
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profileIdentifier]); // Re-fetch when profileIdentifier changes

  // Handle follow/unfollow action
  const handleToggleFollow = async () => {
    if (!handle || isOurProfile) return;
    
    try {
      const result = await userService.toggleFollow(handle);
      if (result.success) {
        // Update local follow state and follower count
        if (result.data.now_following) {
          setFollowerCount(followerCount + 1);
          setFollowing(true);
        } else {
          setFollowerCount(followerCount - 1);
          setFollowing(false);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Toggle follow error:', err);
      setError('Failed to update follow status');
    }
  };

  if (loading) {
    return <Loader message="Loading profile..." subtitle="Please wait while we fetch the profile data" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-8 border-4 border-sky">
        <h1 className="text-sky text-center mb-8 tracking-wide text-3xl font-extrabold drop-shadow-lg">Profile</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {profile && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* User Information */}
            <div className="bg-lagoon/10 p-6 rounded-lg">
              <h2 className="text-lagoon font-semibold text-xl mb-4">User Information</h2>
              <div className="space-y-2">
                <p className="text-ink"><strong>Email:</strong> {profile.email}</p>
                <p className="text-ink"><strong>Full Name:</strong> {profile.full_name}</p>
                <p className="text-ink"><strong>Username:</strong> @{profile.username}</p>
                <p className="text-ink"><strong>Verified:</strong> {profile.is_verified ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {/* Profile Picture */}
            <div className="bg-sky/10 p-6 rounded-lg">
              <h2 className="text-sky font-semibold text-xl mb-4">Profile Picture</h2>
              {profile?.profile_image ? (
                <img 
                  src={profile.profile_image} 
                  alt="Profile" 
                  className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-sky"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center mx-auto border-4 border-sky">
                  <span className="text-gray-500 text-sm">No Image</span>
                </div>
              )}
            </div>

            {/* Bio */}
            <div className="bg-sunrise/10 p-6 rounded-lg md:col-span-2">
              <h2 className="text-ink font-semibold text-xl mb-4">Bio</h2>
              <p className="text-ink">
                {profile?.bio || 'No bio available. Tell us about yourself!'}
              </p>
            </div>

            {/* Social Media Links */}
            <div className="bg-lagoon/10 p-6 rounded-lg">
              <h2 className="text-lagoon font-semibold text-xl mb-4">Social Media</h2>
              <div className="space-y-3">
                {profile?.facebook_url && (
                  <a href={profile.facebook_url} target="_blank" rel="noopener noreferrer" 
                     className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
                    <span className="mr-2">📘</span> Facebook
                  </a>
                )}
                {profile?.instagram_url && (
                  <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" 
                     className="flex items-center text-pink-600 hover:text-pink-800 transition-colors">
                    <span className="mr-2">📷</span> Instagram
                  </a>
                )}
                {profile?.twitter_url && (
                  <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" 
                     className="flex items-center text-blue-400 hover:text-blue-600 transition-colors">
                    <span className="mr-2">🐦</span> X (Twitter)
                  </a>
                )}
                {profile?.tiktok_url && (
                  <a href={profile.tiktok_url} target="_blank" rel="noopener noreferrer" 
                     className="flex items-center text-black hover:text-gray-700 transition-colors">
                    <span className="mr-2">🎵</span> TikTok
                  </a>
                )}
                {!profile?.facebook_url && !profile?.instagram_url && !profile?.twitter_url && !profile?.tiktok_url && (
                  <p className="text-gray-500 italic">No social media links added</p>
                )}
              </div>
            </div>

            {/* Followers & Following */}
            <div className="bg-sky/10 p-6 rounded-lg">
              <h2 className="text-sky font-semibold text-xl mb-4">Social Stats</h2>
              <div className="flex justify-around text-center">
                <div>
                  <div className="text-2xl font-bold text-ink">{followerCount}</div>
                  <div className="text-sm text-gray-600">Followers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-ink">{followingCount}</div>
                  <div className="text-sm text-gray-600">Following</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          {/* Show different buttons based on whose profile this is */}
          {isOurProfile ? (
            // This is my profile - show Edit Profile and Logout buttons
            <div className="space-y-3">
              <button
                onClick={() => console.log('Edit profile clicked')}
                className="w-full py-3 bg-sky text-ink font-extrabold text-lg rounded-lg shadow-lg hover:bg-opacity-90 transition-colors duration-200"
              >
                Edit Profile
              </button>
              <button
                onClick={logout}
                className="w-full py-3 bg-sunrise text-ink font-extrabold text-lg rounded-lg shadow-lg hover:bg-opacity-90 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          ) : (
            // This is another User's profile - show Follow/Unfollow button
            <div className="space-y-3">
              <button
                onClick={handleToggleFollow}
                className={`w-full py-3 font-extrabold text-lg rounded-lg shadow-lg transition-colors duration-200 ${
                  following 
                    ? 'bg-gray-400 text-white hover:bg-gray-500' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {following ? `Unfollow @${profile?.username}` : `Follow @${profile?.username}`}
              </button>
              <button
                onClick={() => window.history.back()}
                className="w-full py-3 bg-gray-300 text-ink font-semibold text-lg rounded-lg shadow-lg hover:bg-gray-400 transition-colors duration-200"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
