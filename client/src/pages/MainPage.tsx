import { useState, useEffect } from "react";
import "./MainPage.css";
import api from "../services/api";
import ThemeToggle from "../components/common/ThemeToggle";
import { useAuth } from '../context/AuthContext';
// Adjusting path from App.tsx (../photos) to pages/MainPage.tsx (../../photos)
type GalleryItem = { src: string; caption: string };

function MainPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [notices, setNotices] = useState<string[]>([]);

  useEffect(() => {
    // Fetch public notices from API
    api.get('/notices')
      .then((res: { data: any[] }) => {
        const data = res.data;
        if (Array.isArray(data) && data.length > 0) {
          setNotices(data.map((n: any) => `📢 ${n.title} - ${n.content}`));
        } else {
          setNotices([
            "📢 Annual Sports Day – 25 March",
            "📢 Saraswati Puja Celebration",
            "📢 Admission Open For 2026",
            "📢 Parent Teacher Meeting – Sunday",
          ]);
        }
      })
      .catch((err: any) => {
        console.error('Failed to fetch notices:', err);
        setNotices([
          "📢 Annual Sports Day – 25 March",
          "📢 Saraswati Puja Celebration",
          "📢 Admission Open For 2026",
          "📢 Parent Teacher Meeting – Sunday",
        ]);
      });
  }, []);

  const galleryItems: GalleryItem[] = [
    {
      src: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b",
      caption: "Classroom Learning",
    },
    {
      src: "https://images.unsplash.com/photo-1588072432836-e10032774350",
      caption: "School Activities",
    },
    {
      src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644",
      caption: "Students Event",
    },
    {
      src: "https://images.unsplash.com/photo-1607237138185-eedd9c632b0b",
      caption: "Sports Program",
    },
  ];

  return (
    <div className="main-page-wrapper">
      <Navbar open={navOpen} onToggle={() => setNavOpen(!navOpen)} />

      <div className="main-container">
        <Hero />
        <AdmissionSection />
        <NoticeBoard notices={notices} />
        <Gallery items={galleryItems} />
      </div>

      <Footer />
    </div>
  );
}

// --- components ---

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
        <a href="#notice">Notice</a>
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

function Hero() {
  return (
    <section className="hero">
      <img
        src="/banner.png"
        alt="School building"
        loading="eager"
        fetchPriority="high"
        onError={(e) => {
          e.currentTarget.src = "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200";
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
        <p className="hero-subtitle">Empowering Students For A Better Future</p>
      </div>
    </section>
  );
}

function AdmissionSection() {
  return (
    <section id="admission" className="landing-section admission">
      <h2>Admission Form</h2>
      <p>Click the button below to download the admission application form.</p>
      <a href="/form 2025.pdf" download className="download-btn">
        Download PDF
      </a>
    </section>
  );
}


function NoticeBoard({ notices }: { notices: string[] }) {
  return (
    <section id="notice" className="landing-section notice">
      <h2>Latest Notice</h2>
      <div className="notice-board">
        {notices.map((text, idx) => (
          <div className="notice-item" key={idx}>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Gallery({ items }: { items: GalleryItem[] }) {
  return (
    <section id="gallery" className="landing-section gallery">
      <h2>School Gallery</h2>
      <div className="gallery-grid">
        {items.map((item, idx) => (
          <div className="gallery-card" key={idx}>
            <img src={item.src} alt={item.caption} loading="lazy" />
            <p>{item.caption}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="contact" className="landing-footer">
      <div className="footer-main-info">
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
        <p className="footer-reg-no">Regd. No. : SO165438 of 2009-2010</p>
        <p className="footer-udise">Udise No. : 19112601311</p>
      </div>

      <div className="footer-contact-details">
        <p><strong>Mob. No & Whatsapp No. :</strong> 8240267850 / 9830286767</p>
        <p><strong>E-mail:</strong> rabindra.academy@gmail.com / sdssarkar9@gmail.com</p>
        <p><strong>Facebook page :</strong> madhyamgramrabindraacademy</p>
        <p><strong>Website :</strong> <a href="http://www.rabindraacademy.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>www.rabindraacademy.in</a></p>
      </div>

      <div className="social-icons" style={{ marginTop: '1rem' }}>
        <a href="http://www.rabindraacademy.in" target="_blank" rel="noopener noreferrer" title="Website">🌐</a>
        <a href="https://facebook.com/madhyamgramrabindraacademy" target="_blank" rel="noopener noreferrer" title="Facebook">📘</a>
        <a href="#" title="Instagram">📸</a>
        <a href="#" title="Twitter">🐦</a>
      </div>
      
      <p className="copyright">© 2026 Madhyamgram Rabindra Academy | All Rights Reserved</p>
    </footer>
  );
}

export default MainPage;
