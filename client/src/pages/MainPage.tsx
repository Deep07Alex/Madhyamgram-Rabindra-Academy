/**
 * Main Landing Page
 * 
 * The entry point for the public-facing website.
 * Features:
 * - Dynamic school notices
 * - Festival banner management
 * - Admission information
 * - Responsive navigation
 */
import { useState, useEffect } from "react";
import "./MainPage.css";
import api from "../services/api";
import ThemeToggle from "../components/common/ThemeToggle";
import { useAuth } from '../context/AuthContext';

type GalleryItem = { src: string; caption: string };

function MainPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [heroBanner, setHeroBanner] = useState("/banner.png");
  const [festivalBanner, setFestivalBanner] = useState("/dol.png");
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  useEffect(() => {
    // Fetch dynamic assets
    api.get('/system/hero-banner')
      .then(res => {
        if (res.data.url) setHeroBanner(res.data.url);
      })
      .catch(err => console.error('Failed to fetch hero banner:', err));

    api.get('/system/festival-banner')
      .then(res => {
        if (res.data.url) setFestivalBanner(res.data.url);
      })
      .catch(err => console.error('Failed to fetch festival banner:', err));

    api.get('/gallery')
      .then(res => {
        if (Array.isArray(res.data)) {
          setGalleryItems(res.data.map((item: any) => ({
            src: item.imageUrl,
            caption: item.title
          })));
        }
      })
      .catch(err => console.error('Failed to fetch gallery:', err));
  }, []);

  return (
    <div className="main-page-wrapper">
      <Navbar open={navOpen} onToggle={() => setNavOpen(!navOpen)} />

      <div className="main-container">
        <Hero bannerUrl={heroBanner} />
        <FestivalSection bannerUrl={festivalBanner} />
        <Gallery items={galleryItems} />
      </div>

      <Footer />
    </div>
  );
}

// --- components ---

/**
 * Navbar Component
 * 
 * Standardizes primary navigation across the landing page.
 * Logic:
 * - Responsive: Toggles a slide-out menu on mobile devices.
 * - Dynamic Login: Replaces the 'Login' CTA with a 'Dashboard' link if a session is active.
 * - Role-Aware: Correctly routes the user to Admin, Teacher, or Student portals.
 */
function Navbar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { user } = useAuth();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin/dashboard';
    if (user.role === 'TEACHER') return '/teacher/dashboard';
    if (user.role === 'STUDENT') return '/student/dashboard';
    return '/login';
  };

  return (
    <nav className="landing-navbar">
      <div className="logo-group">
        <img src="/RABINDRA_LOGO.jpeg" alt="Logo" className="nav-logo-img" loading="eager" fetchPriority="high" />
        <div className="logo-text-wrapper">
          <h2 className="logo">MADHYAMGRAM RABINDRA ACADEMY</h2>
          <p className="nav-tagline">Education ★ Culture ★ Art</p>
          <div className="nav-info-row">
            <span>UDISE: 19112601311</span>
            <span>ESTD: 2005</span>
          </div>
        </div>
      </div>
      <button
        className="landing-nav-toggle"
        onClick={onToggle}
        aria-label="Toggle navigation"
      >
        ☰
      </button>
      <div className={"landing-nav-menu" + (open ? " open" : "")}>
        <a href="#">Home</a>
        <a href="#admission">Admission</a>
        <a href="#notice">Upcoming Festivals</a>
        <a href="#gallery">Gallery</a>
        <a href="#contact">Contact</a>
        <div style={{ marginLeft: '12px', display: 'flex', alignItems: 'center' }}>
          <ThemeToggle />
        </div>
        {user ? (
          <a href={getDashboardPath()} className="login-btn" style={{ background: 'var(--primary-bold)', color: 'white' }}>Dashboard</a>
        ) : (
          <a href="/login" className="login-btn">Login</a>
        )}
      </div>
    </nav>
  );
}

/**
 * Hero Section
 * Displays the school name, tagline, and main banner image.
 */
function Hero({ bannerUrl }: { bannerUrl: string }) {
  const baseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';
  const fullUrl = (bannerUrl.startsWith('/') ? `${baseUrl}${bannerUrl}` : bannerUrl) + `?t=${Date.now()}`;

  return (
    <section className="hero">
      <img
        src={fullUrl}
        alt="School building"
        loading="eager"
        fetchPriority="high"
        onError={(e) => {
          e.currentTarget.src = "/banner.png";
        }}
      />
      <div className="hero-content">
        <p className="hero-mission-top">Education ★ Culture ★ Art</p>
        <h1>MADHYAMGRAM RABINDRA ACADEMY</h1>
        <div className="hero-level-badge">K.G. & PRIMARY SCHOOL</div>
        <div className="hero-stats-row">
          <span>UDISE CODE: 19112601311</span>
          <span>ESTD: 2005</span>
        </div>
      </div>
    </section>
  );
}



/**
 * Festival Section
 * 
 * The main engagement area for public announcements.
 * - Displays a dynamic banner managed by administrators in the 'ManageAssets' CMS.
 */
function FestivalSection({ bannerUrl }: { bannerUrl: string }) {
  const baseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';
  const fullUrl = (bannerUrl.startsWith('/') ? `${baseUrl}${bannerUrl}` : bannerUrl) + `?t=${Date.now()}`;

  return (
    <section id="notice" className="landing-section notice">
      <h2>Upcoming Festivals</h2>
      <img
        src={fullUrl}
        alt="Upcoming Festival"
        loading="lazy"
        style={{ width: '100%', height: 'auto', maxHeight: '600px', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
      />
    </section>
  );
}

function Gallery({ items }: { items: GalleryItem[] }) {
  const baseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || '';

  return (
    <section id="gallery" className="landing-section gallery">
      <h2>School Gallery</h2>
      <div className="gallery-grid">
        {items.map((item, idx) => {
          const imgSrc = (item.src.startsWith('/') ? `${baseUrl}${item.src}` : item.src) + `?t=${Date.now()}`;
          return (
            <div className="gallery-card" key={idx}>
              <img src={imgSrc} alt={item.caption} loading="lazy" />
              <p>{item.caption}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="contact" className="landing-footer">
      <div className="footer-main-info">
        <p>Madhyamgram</p>
        <h3 className="footer-title">RABINDRA ACADEMY</h3>
        <p className="footer-mission">Education ★ Culture ★ Art</p>
        <div className="footer-level">K.G. & PRIMARY SCHOOL</div>
        <p className="footer-estd">Estd. : 2005</p>
      </div>

      <div className="footer-address">
        <p>Rabindranagar-Milanpally, P.O. - Ganganagar,</p>
        <p>P.S.-Madhyamgram, North 24 Parganas, Kolkata - 700132</p>
      </div>

      <div className="footer-registration-box">
        <p>Registered by West Bengal Govt.</p>
        <p>Following West Bengal Board of Primary Education Syllabus</p>
        <p className="footer-udise">Udise No. : 19112601311</p>
      </div>

      <div className="footer-contact-details">
        <p><strong>Mob. No & Whatsapp No. :</strong> 8240267850 / 9830286767</p>
        <p><strong>E-mail:</strong> rabindra.academy@gmail.com / sdssarkar9@gmail.com</p>
        <p><strong>Facebook page :</strong> madhyamgramrabindraacademy</p>
        <p><strong>Website :</strong> <a href="https://madhyamgramrabindraacademy.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>www.madhyamgramrabindraacademy.in</a></p>
      </div>

      <div className="social-icons" style={{ marginTop: '1rem' }}>
        <a href="https://madhyamgramrabindraacademy.in" target="_blank" rel="noopener noreferrer" title="Website">🌐</a>
        <a href="https://facebook.com/madhyamgramrabindraacademy" target="_blank" rel="noopener noreferrer" title="Facebook">📘</a>
        <a href="#" title="Instagram">📸</a>
        <a href="#" title="Twitter">🐦</a>
      </div>

      <p className="copyright">© 2026 Madhyamgram Rabindra Academy | All Rights Reserved</p>
    </footer>
  );
}

export default MainPage;
