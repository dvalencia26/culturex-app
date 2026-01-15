import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import ThreadForm from '../../components/ThreadForm/ThreadForm';
import { useAuth } from '../../contexts/AuthContext';


// CreateThreadPage display the thread form and redirects to the new thread if the submission is successful
const CreateThreadPage = () => {
    const navigate = useNavigate();
    const {user} = useAuth();

    useEffect(() => {
        // Redirect to login if not authenticated
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    const handleSuccess = (thread) => {
        // Navigate to the new created thread page
        navigate(`/u/${thread.author_username}/threads/${thread.slug}`);
    };

 return (
    <div className="min-h-screen bg-[var(--color-background-snow)] font-ui pt-8 pb-16">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[var(--text-color-ink-400)] hover:text-[var(--primary-color-royal)] transition-colors mb-4"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-[var(--primary-color-royal)] font-editorial">
            Start a Discussion
          </h1>
          <p className="mt-2 text-[var(--text-color-ink-400)]">
            Ask questions, share experiences, and connect with the community!
          </p>
        </div>

        {/* Form */}
        <div className="bg-[var(--color-white)] rounded-lg shadow-card p-6">
          <ThreadForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
};

export default CreateThreadPage
