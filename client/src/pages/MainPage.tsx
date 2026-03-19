import { useState, useEffect } from "react";
import "./MainPage.css";
import ThemeToggle from "../components/common/ThemeToggle";
// Adjusting path from App.tsx (../photos) to pages/MainPage.tsx (../../photos)
type GalleryItem = { src: string; caption: string };

function MainPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [notices, setNotices] = useState<string[]>([]);

  useEffect(() => {
    // Fetch public notices from API
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/notices`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // If API returns notices, format them
          setNotices(data.map((n: any) => `📢 ${n.title} - ${n.content}`));
        } else {
          // Fallback to static if none exist
          setNotices([
            "📢 Annual Sports Day – 25 March",
            "📢 Saraswati Puja Celebration",
            "📢 Admission Open For 2026",
            "📢 Parent Teacher Meeting – Sunday",
          ]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch notices:', err);
        // Fallback
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
  return (
    <nav className="landing-navbar">
      <div className="logo-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <h2 className="logo" style={{ marginBottom: 0 }}>Madhyamgram Rabindra Academy</h2>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.65rem', fontWeight: '850', color: 'var(--nav-text)', letterSpacing: '0.02em' }}>
          <span>UDISE: 19112601311</span>
          <span>ESTD: 2005</span>
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
        <a href="/login" className="login-btn">Login</a>
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
        loading="lazy"
        onError={(e) => {
          // Default fallback if image doesn't exist
          e.currentTarget.src = "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200";
        }}
      />
      <div className="hero-content">
        <h1>Welcome To Madhyamgram Rabindra Academy</h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '16px', fontSize: '1rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '0.05em' }}>
           <span>UDISE CODE: 19112601311</span>
           <span>ESTD: 2005</span>
        </div>
        <p>Empowering Students For A Better Future</p>
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
      <h3>Madhyamgram Rabindra Academy</h3>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '0.8rem', opacity: 0.8, marginBottom: '10px', fontWeight: '600' }}>
        <span>UDISE: 19112601311</span>
        <span>ESTD: 2005</span>
      </div>
      <p>Providing Quality Education Since 2005</p>
      <div className="social-icons">
        <a href="#">🌐</a>
        <a href="#">📘</a>
        <a href="#">📸</a>
        <a href="#">🐦</a>
      </div>
      <p className="copyright">© 2026 Madhyamgram Rabindra Academy</p>
    </footer>
  );
}

export default MainPage;
