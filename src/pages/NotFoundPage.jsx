import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import { ArrowRightIcon } from '../components/icons';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <Navbar />
      <main className="not-found-main" id="main-content">
        <div className="container not-found-container">
          <div className="not-found-badge">404 • Resource Not Located</div>
          <h1 className="not-found-title">
            Page Not <span className="gradient-text-gold">Found</span>
          </h1>
          <p className="not-found-desc">
            The page or route you requested does not exist or has been relocated within our enterprise architecture.
          </p>

          <div className="not-found-actions">
            <Link to="/" className="btn btn-primary not-found-btn">
              <span>Return to Home</span>
              <ArrowRightIcon size={16} />
            </Link>
            <Link to="/solutions" className="btn btn-secondary not-found-btn">
              <span>Explore Solutions</span>
            </Link>
            <Link to="/careers" className="btn btn-secondary not-found-btn">
              <span>View Careers</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
