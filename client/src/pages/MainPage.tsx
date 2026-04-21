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
import { useState, useEffect, memo, useCallback } from "react";
import { App } from "@capacitor/app";
import "./MainPage.css";
import api, { getBaseUrl } from "../services/api";
import { Capacitor } from "@capacitor/core";
import ThemeToggle from "../components/common/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import useServerEvents from "../hooks/useServerEvents";

// Swiper imports
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, Pagination } from "swiper/modules";

// Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import { Star, Bell, FileText, Download, Users, Plus } from "lucide-react";

type GalleryItem = { src: string; caption: string };

function MainPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [heroBanner, setHeroBanner] = useState("");
  const [festivalBanners, setFestivalBanners] = useState<any[] | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [alumni, setAlumni] = useState<any[]>([]);
  const [toppers, setToppers] = useState<any[]>([]);
  const [topperSession, setTopperSession] = useState("2025-26");

  const fetchNotices = useCallback(async () => {
    try {
      const res = await api.get("/notices");
      setNotices(res.data.filter((n: any) => n.type === "PUBLIC"));
    } catch (err) {
      console.error("Failed to fetch notices:", err);
    }
  }, []);

  const fetchHeroBanner = useCallback(async () => {
    try {
      const res = await api.get("/system/hero-banner");
      if (res.data.url) setHeroBanner(res.data.url);
    } catch (err) {
      console.error("Failed to fetch hero banner:", err);
    }
  }, []);

  const fetchFestivalBanners = useCallback(async () => {
    try {
      const res = await api.get("/system/festival-banner/all");
      if (res.data.banners) setFestivalBanners(res.data.banners);
    } catch (err) {
      console.error("Failed to fetch festival banners:", err);
    }
  }, []);

  const fetchToppers = useCallback(async () => {
    try {
      const res = await api.get("/toppers");
      if (res.data.students) setToppers(res.data.students);
      if (res.data.session) setTopperSession(res.data.session);
    } catch (err) {
      console.error("Failed to fetch toppers:", err);
    }
  }, []);

  const fetchGallery = useCallback(async () => {
    try {
      const res = await api.get("/gallery");
      if (Array.isArray(res.data)) {
        setGalleryItems(res.data.map((item: any) => ({
          src: item.imageUrl,
          caption: item.title,
        })));
      }
    } catch (err) {
      console.error("Failed to fetch gallery:", err);
    }
  }, []);

  const fetchResources = useCallback(async () => {
    try {
      const res = await api.get("/resources");
      setResources(res.data);
    } catch (err) {
      console.error("Failed to fetch resources:", err);
    }
  }, []);

  const fetchAlumni = useCallback(async () => {
    try {
      const res = await api.get("/alumni");
      setAlumni(res.data);
    } catch (err) {
      console.error("Failed to fetch alumni:", err);
    }
  }, []);

  useEffect(() => {
    // Optimization: Load cached data if available for instant rendering
    const cachedData = localStorage.getItem('main_page_cache');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.heroBanner) setHeroBanner(parsed.heroBanner);
        if (parsed.festivalBanners) setFestivalBanners(parsed.festivalBanners);
        if (parsed.toppers) setToppers(parsed.toppers);
        if (parsed.gallery) setGalleryItems(parsed.gallery);
        if (parsed.notices) setNotices(parsed.notices);
        if (parsed.resources) setResources(parsed.resources);
        if (parsed.alumni) setAlumni(parsed.alumni);
      } catch (e) {
        console.warn('Failed to parse main page cache');
      }
    }

    // Fetch all dynamic assets in parallel to optimize initial load
    Promise.all([
      api.get("/system/hero-banner"),
      api.get("/system/festival-banner/all"),
      api.get("/toppers"),
      api.get("/gallery"),
      api.get("/notices"),
      api.get("/resources"),
      api.get("/alumni")
    ]).then(([heroRes, festRes, topperRes, galleryRes, noticeRes, resourceRes, alumniRes]) => {
      const newHero = heroRes.data.url || "/banner.png";
      const newFest = festRes.data.banners || [];
      const newToppers = topperRes.data.students || [];
      const newGallery = Array.isArray(galleryRes.data) ? galleryRes.data.map((item: any) => ({
        src: item.imageUrl,
        caption: item.title,
      })) : [];
      const newNotices = (noticeRes.data || []).filter((n: any) => n.type === "PUBLIC");
      const newResources = resourceRes.data || [];
      const newAlumni = alumniRes.data || [];

      setHeroBanner(newHero);
      if (festRes.data.banners) setFestivalBanners(newFest);
      if (topperRes.data.students) setToppers(newToppers);
      if (topperRes.data.session) setTopperSession(topperRes.data.session);
      setGalleryItems(newGallery);
      setNotices(newNotices);
      setResources(newResources);
      setAlumni(newAlumni);

      // Cache the result for next time
      localStorage.setItem('main_page_cache', JSON.stringify({
        heroBanner: newHero,
        festivalBanners: newFest,
        toppers: newToppers,
        gallery: newGallery,
        notices: newNotices,
        resources: newResources,
        alumni: newAlumni
      }));
    }).catch(err => {
      console.error("Initial data load failed:", err);
      // Ensure fallbacks are set even on failure
      if (!heroBanner) setHeroBanner("/banner.png");
    });
  }, []);

  // Real-time Optimization:
  // Automatically refreshes the UI sections when administrative changes occur.
  useServerEvents({
    'new_notice': () => fetchNotices(),
    'notice_deleted': () => fetchNotices(),
    'alumni:updated': () => fetchAlumni(),
    'toppers:updated': () => fetchToppers(),
    'resources:updated': () => fetchResources(),
    'gallery:updated': () => fetchGallery(),
    'system:config_updated': (data: any) => {
      if (data.key === 'hero_banner_url') fetchHeroBanner();
      else fetchFestivalBanners();
    }
  });

  // Hardware Back Button:
  // If the mobile menu is open, the back button should close it first.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backListener = App.addListener('backButton', () => {
      if (navOpen) {
        setNavOpen(false);
      } else {
        // If menu is closed, let the app naturally exit or go back
        window.history.back();
      }
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, [navOpen]);

  const isNative = Capacitor.isNativePlatform();

  return (
    <div className={`main-page-wrapper ${isNative ? 'native-app' : ''}`}>
      <Navbar open={navOpen} onToggle={() => setNavOpen(!navOpen)} />

      <div className="main-container">
        <MemoizedHero bannerUrl={heroBanner} />
        <MemoizedToppersSection students={toppers} session={topperSession} />
        <MemoizedNoticeAndResources notices={notices} resources={resources} />
        <MemoizedFestivalSection banners={festivalBanners} />
        <MemoizedGallery items={galleryItems} />
        <MemoizedAlumniGallery photos={alumni} isNative={isNative} />
      </div>

      <MemoizedFooter />
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
    if (!user) return "/login";
    // Native (Capacitor) uses a unified dashboard path
    if (Capacitor.isNativePlatform()) return "/dashboard";

    if (user.role === "ADMIN") return "/admin/dashboard";
    if (user.role === "TEACHER") return "/teacher/dashboard";
    if (user.role === "STUDENT") return "/student/dashboard";
    return "/login";
  };

  const handleNavClick = (id: string) => {
    if (open) onToggle(); // Close mobile menu
    if (id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="landing-navbar">
      <div className="logo-group">
        <img
          src="/RABINDRA_LOGO.jpeg"
          alt="Logo"
          className="nav-logo-img"
          loading="eager"
          fetchPriority="high"
        />
        <div className="logo-text-wrapper">
          <h2 className="logo">MADHYAMGRAM RABINDRA ACADEMY</h2>
          <div className="nav-tagline-mobile-row">
            <p className="nav-tagline">Education ★ Culture ★ Art</p>
            <div className="nav-info-row">
              <span>UDISE: 19112601311</span>
              <span>ESTD: 2005</span>
            </div>
          </div>
        </div>
      </div>
      <button
        className="landing-nav-toggle"
        onClick={onToggle}
        aria-label="Toggle navigation"
        style={{ marginRight: '-10px' }}
      >
        <div className="hamburger-icon-wrapper">
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      </button>
      <div className={"landing-nav-menu" + (open ? " open" : "")}>
        <a href="javascript:void(0)" onClick={() => handleNavClick("home")}>Home</a>
        <a href="javascript:void(0)" onClick={() => handleNavClick("notice-resources")}>Admission</a>
        <a href="javascript:void(0)" onClick={() => handleNavClick("notice")}>Upcoming Events</a>
        <a href="javascript:void(0)" onClick={() => handleNavClick("gallery")}>Gallery</a>
        <a href="javascript:void(0)" onClick={() => handleNavClick("contact")}>Contact</a>
        <div
          style={{ marginLeft: "12px", display: "flex", alignItems: "center" }}
        >
          <ThemeToggle />
        </div>
        {user ? (
          <a
            href={`#${getDashboardPath()}`}
            className="login-btn"
            style={{ background: "var(--primary-bold)", color: "white" }}
          >
            Dashboard
          </a>
        ) : (
          <a href="#/login" className="login-btn">
            Login
          </a>
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
  const baseUrl = getBaseUrl();
  const fullUrl = bannerUrl
    ? (bannerUrl.startsWith("/") ? `${baseUrl}${bannerUrl}` : bannerUrl)
    : "";

  return (
    <section className="hero">
      {bannerUrl ? (
        <img
          src={fullUrl}
          alt="School building"
          loading="lazy"
          fetchPriority="high"
          onError={(e) => {
            e.currentTarget.src = "/banner.png";
          }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'var(--bg-main)' }}></div>
      )}
    </section>
  );
}

/**
 * Festival Section
 *
 * The main engagement area for public announcements.
 * - Displays a dynamic banner managed by administrators in the 'ManageAssets' CMS.
 */
function ToppersSection({ students, session }: { students: any[], session: string }) {
  if (!students || students.length === 0) return null;

  const baseUrl = getBaseUrl();

  return (
    <section className="landing-section toppers">
      <div className="section-header">
        <span className="section-badge">Academic Excellence</span>
        <h2>Class Toppers ({session})</h2>
        <div className="section-divider"></div>
      </div>

      <div className="toppers-slider-wrapper">
        <Swiper
          modules={[Autoplay, Pagination]}
          spaceBetween={20}
          slidesPerView={1.2}
          centeredSlides={false}
          loop={students.length > 4}
          autoplay={{ delay: 3500, disableOnInteraction: false }}
          pagination={{ clickable: true, dynamicBullets: true }}
          breakpoints={{
            480: { slidesPerView: 2.2 },
            768: { slidesPerView: 3.2 },
            1024: { slidesPerView: 4 }
          }}
          className="toppers-swiper"
        >
          {[...students]
            .sort((a, b) => parseInt(a.rank || '1') - parseInt(b.rank || '1'))
            .map((topper, idx) => (
              <SwiperSlide key={idx}>
                <div className="topper-card">
                  <div className="topper-rank">
                    <Star size={14} fill="currentColor" />
                    <span>{topper.rank || '1st'}</span>
                  </div>
                  <div className="topper-avatar-wrapper">
                    <img
                      src={topper.photo
                        ? (topper.photo.startsWith("/") ? `${baseUrl}${topper.photo}` : topper.photo)
                        : (topper.gender === 'boy' ? "/student_topper_boy.png" : "/student_topper_girl.png")
                      }
                      alt={topper.name}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    />
                  </div>
                  <div className="topper-info">
                    <h3>{topper.class}</h3>
                    <p>{topper.name}</p>
                  </div>
                </div>
              </SwiperSlide>
            ))}
        </Swiper>
      </div>
    </section>
  );
}

function FestivalSection({ banners }: { banners: any[] | null }) {
  const baseUrl = getBaseUrl();

  // Handle loading state: Show nothing (clean background) until API returns or fails
  if (banners === null) return null;

  // Use fetched banners or fall back to defaults if empty
  const displayBanners = (banners && banners.length > 0)
    ? banners
    : [
      { imageUrl: "/festivals/diwali.png", title: "Happy Diwali" },
      { imageUrl: "/festivals/eid.png", title: "Eid Mubarak" },
      { imageUrl: "/festivals/christmas.png", title: "Merry Christmas" }
    ];

  return (
    <section id="notice" className="landing-section notice">
      <div className="section-header" style={{ textAlign: "center", marginBottom: "40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span className="section-badge">Seasonal</span>
        <h2>Upcoming Events</h2>
        <div className="section-divider"></div>
      </div>
      <div className="festival-slider-wrapper">
        <Swiper
          modules={[Navigation, Autoplay, Pagination]}
          spaceBetween={30}
          slidesPerView={1}
          navigation
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true, dynamicBullets: true }}
          loop={displayBanners.length > 1}
          edgeSwipeDetection={true}
          grabCursor={true}
          className="festival-swiper"
        >
          {displayBanners.map((banner, idx) => {
            const fullUrl = (banner.imageUrl.startsWith("/") ? `${baseUrl}${banner.imageUrl}` : banner.imageUrl);
            return (
              <SwiperSlide key={idx}>
                <div className="festival-slide-content">
                  <img
                    src={fullUrl}
                    alt={banner.title || `Festival ${idx + 1}`}
                    loading="lazy"
                    className="festival-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).parentElement!.style.background = "var(--bg-main)";
                    }}
                  />
                  <div className="festival-overlay">
                    <h3>{banner.title || "Special Celebration"}</h3>
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </section>
  );
}

function Gallery({ items }: { items: GalleryItem[] }) {
  const baseUrl = getBaseUrl();

  if (!items || items.length === 0) return null;

  return (
    <section id="gallery" className="landing-section gallery">
      <div className="section-header" style={{ textAlign: "center", marginBottom: "40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span className="section-badge">Memories</span>
        <h2>School Gallery</h2>
        <div className="section-divider"></div>
      </div>
      <div className="gallery-slider-wrapper" style={{ padding: "0 0 40px", maxWidth: "1200px", margin: "0 auto" }}>
        <Swiper
          modules={[Autoplay, Pagination, Navigation]}
          spaceBetween={20}
          slidesPerView={1}
          navigation
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true, dynamicBullets: true }}
          breakpoints={{
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 }
          }}
          className="gallery-swiper"
        >
          {items.map((item, idx) => {
            const imgSrc = (item.src.startsWith("/") ? `${baseUrl}${item.src}` : item.src);
            return (
              <SwiperSlide key={idx}>
                <div className="gallery-card">
                  <div className="gallery-img-container" style={{ aspectRatio: '4/3', width: '100%', overflow: 'hidden' }}>
                    <img src={imgSrc} alt={item.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  </div>
                  <p>{item.caption}</p>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </section>
  );
}

function NoticeAndResources({ notices, resources }: { notices: any[]; resources: any[] }) {
  const baseUrl = getBaseUrl();

  return (
    <section id="notice-resources" className="landing-section notice-resources">
      <div className="section-grid">
        {/* Notice Board */}
        <div className="section-column">
          <div className="column-header">
            <span className="section-badge">Latest News</span>
            <h2>Notice Board</h2>
          </div>
          <div className="notice-board-container">
            <div className="notice-scroll-area">
              {notices.length > 0 ? (
                notices.map((notice) => (
                  <div key={notice.id} className="notice-item">
                    <div className="notice-icon">
                      <Bell size={18} />
                    </div>
                    <div className="notice-text">
                      <h4>{notice.title}</h4>
                      <p>{notice.content}</p>
                      <span className="notice-date">
                        {new Date(notice.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-msg">No new notices at this time.</p>
              )}
            </div>
          </div>
        </div>

        {/* School Resources */}
        <div className="section-column">
          <div className="column-header">
            <span className="section-badge">Downloads</span>
            <h2>School Resources / And Forms</h2>
          </div>
          <div className="resources-board-container">
            <div className="resources-scroll-area">
              {resources.length > 0 ? (
                <div className="resources-grid">
                  {resources.map((res) => (
                    <a
                      key={res.id}
                      href={res.fileUrl.startsWith("/") ? `${baseUrl}${res.fileUrl}` : res.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resource-card"
                    >
                      <div className="resource-icon-wrapper">
                        <FileText size={22} />
                      </div>
                      <div className="resource-details">
                        <p className="res-cat">{res.category}</p>
                        <h4>{res.title}</h4>
                      </div>
                      <div className="download-btn-icon">
                        <Download size={16} />
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="empty-msg">No resources available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AlumniGallery({ photos, isNative }: { photos: any[]; isNative: boolean }) {
  const [visibleCount, setVisibleCount] = useState(6);
  const baseUrl = getBaseUrl();

  const visiblePhotos = photos.slice(0, visibleCount);
  const hasMore = photos.length > visibleCount;

  return (
    <section id="alumni-gallery" className="landing-section alumni-gallery">
      <div className="section-header">
        <span className="section-badge">Memories</span>
        <h2>School Alumni Photos</h2>
        <div className="section-divider"></div>
        <p className="section-subtitle">
          Relive our proudest moments and download memories of our achievers.
        </p>
      </div>

      {photos.length > 0 ? (
        isNative ? (
          <div className="alumni-slider-wrapper" style={{ padding: "0 0 40px", maxWidth: "1200px", margin: "0 auto" }}>
            <Swiper
              modules={[Autoplay, Pagination, Navigation]}
              spaceBetween={20}
              slidesPerView={1.2}
              navigation
              autoplay={{ delay: 4500, disableOnInteraction: false }}
              pagination={{ clickable: true, dynamicBullets: true }}
              className="alumni-swiper"
            >
              {photos.map((photo) => (
                <SwiperSlide key={photo.id}>
                  <div className="alumni-card">
                    <div className="alumni-image-wrapper">
                      <img
                        src={(photo.imageUrl.startsWith("/") ? `${baseUrl}${photo.imageUrl}` : photo.imageUrl)}
                        alt={photo.title}
                        loading="lazy"
                      />
                      <div className="alumni-overlay">
                        <a
                          href={(photo.imageUrl.startsWith("/") ? `${baseUrl}${photo.imageUrl}` : photo.imageUrl)}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="alumni-download-btn"
                          title="Download high-res photo"
                        >
                          <Download size={22} />
                        </a>
                      </div>
                    </div>
                    <div className="alumni-info">
                      <h4>{photo.title}</h4>
                      {photo.description && <p>{photo.description}</p>}
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        ) : (
          <div className="alumni-grid">
            {visiblePhotos.map((photo) => (
              <div key={photo.id} className="alumni-card">
                <div className="alumni-image-wrapper">
                  <img
                    src={(photo.imageUrl.startsWith("/") ? `${baseUrl}${photo.imageUrl}` : photo.imageUrl)}
                    alt={photo.title}
                    loading="lazy"
                  />
                  <div className="alumni-overlay">
                    <a
                      href={(photo.imageUrl.startsWith("/") ? `${baseUrl}${photo.imageUrl}` : photo.imageUrl)}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="alumni-download-btn"
                      title="Download high-res photo"
                    >
                      <Download size={22} />
                    </a>
                  </div>
                </div>
                <div className="alumni-info">
                  <h4>{photo.title}</h4>
                  {photo.description && <p>{photo.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="empty-alumni">
          <Users size={40} />
          <p>Our alumni memories are being curated. Check back soon!</p>
        </div>
      )}

      {!isNative && hasMore && (
        <div className="load-more-container">
          <button
            className="btn-load-more"
            onClick={() => setVisibleCount(prev => prev + 6)}
          >
            <span>Show More Memories</span>
            <Plus size={18} />
          </button>
        </div>
      )}
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
        <p>
          <strong>Mob. No & Whatsapp No. :</strong> 8240267850 / 9830286767
        </p>
        <p>
          <strong>E-mail:</strong> rabindra.academy@gmail.com /
          sdssarkar9@gmail.com
        </p>
        <p>
          <strong>Facebook page :</strong> madhyamgramrabindraacademy
        </p>
        <p>
          <strong>Website :</strong>{" "}
          <a
            href="https://madhyamgramrabindraacademy.in"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--primary)", textDecoration: "none" }}
          >
            www.madhyamgramrabindraacademy.in
          </a>
        </p>
      </div>

      <div className="social-icons" style={{ marginTop: "1rem" }}>
        <a
          href="https://madhyamgramrabindraacademy.in"
          target="_blank"
          rel="noopener noreferrer"
          title="Website"
        >
          🌐
        </a>
        <a
          href="https://facebook.com/madhyamgramrabindraacademy"
          target="_blank"
          rel="noopener noreferrer"
          title="Facebook"
        >
          📘
        </a>
        <a href="#" title="Instagram">
          📸
        </a>
        <a href="#" title="Twitter">
          🐦
        </a>
      </div>

      <p className="copyright">
        © 2026 Madhyamgram Rabindra Academy | All Rights Reserved
      </p>
    </footer>
  );
}
// Memoize sections for performance
const MemoizedHero = memo(Hero);
const MemoizedToppersSection = memo(ToppersSection);
const MemoizedNoticeAndResources = memo(NoticeAndResources);
const MemoizedFestivalSection = memo(FestivalSection);
const MemoizedGallery = memo(Gallery);
const MemoizedAlumniGallery = memo(AlumniGallery);
const MemoizedFooter = memo(Footer);

export default MainPage;