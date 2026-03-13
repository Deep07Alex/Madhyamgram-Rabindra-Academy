import { useState } from "react";
import "./MainPage.css";
// Adjusting path from App.tsx (../photos) to pages/MainPage.tsx (../../photos)
type GalleryItem = { src: string; caption: string };

function MainPage() {
  const [navOpen, setNavOpen] = useState(false);

  const notices = [
    "📢 Annual Sports Day – 25 March",
    "📢 Saraswati Puja Celebration",
    "📢 Admission Open For 2026",
    "📢 Parent Teacher Meeting – Sunday",
  ];

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
        <QuickLinks />
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
      <h2 className="logo">Madhyamgram Rabindra Academy</h2>
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
        onError={(e) => { 
          // Default fallback if image doesn't exist
          e.currentTarget.src = "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200"; 
        }} 
      />
      <div className="hero-content">
        <h1>Welcome To Madhyamgram Rabindra Academy</h1>
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
      <a href="/admission-form.pdf" download className="download-btn">
        Download PDF
      </a>
    </section>
  );
}

function QuickLinks() {
  return (
    <section className="landing-section quick-links">
      <h2>Student's Corner</h2>
      <ul>
        <li><a href="/annual-sports">Annual Sports</a></li>
        <li><a href="/annual-topper-list">Annual Topper List</a></li>
        <li><a href="/cultural-programs">Cultural Programs</a></li>
        <li><a href="/downloads">Downloads</a></li>
        <li><a href="/holiday-calendar">Holiday Calendar</a></li>
        <li><a href="/inter-school-contest">Inter School Contest</a></li>
        <li><a href="/prize-distribution">Prize Distribution</a></li>
        <li><a href="/result">Result</a></li>
        <li><a href="/science-club">Science Club</a></li>
      </ul>
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
            <img src={item.src} alt={item.caption} />
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
      <p>Providing Quality Education Since 1995</p>
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
