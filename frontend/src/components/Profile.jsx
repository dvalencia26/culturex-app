import React from 'react'
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-12 border-4 border-sky">
        <h1 className="text-sky text-center mb-8 tracking-wide text-3xl font-extrabold drop-shadow-lg">Profile</h1>

        {user && (
          <div className="space-y-4">
            <div className="bg-lagoon/10 p-4 rounded-lg">
              <h2 className="text-lagoon font-semibold text-lg mb-2">User Information</h2>
              <p className="text-ink"><strong>Email:</strong> {user.email}</p>
              <p className="text-ink"><strong>Full Name:</strong> {user.full_name}</p>
              <p className="text-ink"><strong>Verified:</strong> {user.is_verified ? 'Yes' : 'No'}</p>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={logout}
            className="w-full py-3 bg-sunrise text-ink font-extrabold text-lg rounded-lg shadow-lg hover:bg-opacity-90 transition-colors duration-200"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export default Profile
