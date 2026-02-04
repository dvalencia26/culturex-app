import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const JoinCommunity = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreateBlog = () => {
    if (user) {
      navigate('/create-post');
    } else {
      navigate('/login');
    }
  };

  const handleCreateDiscussion = () => {
    if (user) {
      navigate('/create-thread');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="w-full bg-[var(--color-ivory)] py-16 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-[var(--primary-color-royal)] font-editorial italic mb-6">
          Travel is better when it's shared
        </h2>
        <p className="text-lg md:text-xl text-[var(--text-color-ink-400)] leading-relaxed mb-10 max-w-2xl mx-auto">
          Join a community of people documenting their travel experiences and learning from each other.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <button
            onClick={handleCreateBlog}
            className="px-8 py-4 bg-[var(--color-gold)] text-[var(--text-color-ink)] font-bold text-lg rounded-input shadow-card hover:bg-[var(--color-gold-600)] hover:shadow-lg transition-all duration-200 ease-[var(--ease-snappy)] min-w-[200px]"
          >
            Start a Blog
          </button>
          <button
            onClick={handleCreateDiscussion}
            className="px-8 py-4 bg-[var(--primary-color-royal)] text-[var(--color-white)] font-bold text-lg rounded-input shadow-card hover:bg-[var(--primary-color-royal-600)] hover:shadow-lg transition-all duration-200 ease-[var(--ease-snappy)] min-w-[200px]"
          >
            Create a Discussion
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinCommunity;
