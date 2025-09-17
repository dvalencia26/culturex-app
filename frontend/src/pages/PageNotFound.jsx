import { Link } from 'react-router-dom';
const PageNotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background-snow)] font-ui">
      <h1 className="text-6xl font-extrabold text-[var(--primary-color-royal)] mb-4">404</h1>
      <p className="text-xl text-[var(--text-color-ink-600)] mb-8">Oops! The page you're looking for doesn't exist.</p>
      <Link to="/" className="text-[var(--color-gold)] hover:text-[var(--color-gold-600)] font-semibold transition-colors duration-200">
        Go back home
      </Link>
    </div>
  )
}

export default PageNotFound