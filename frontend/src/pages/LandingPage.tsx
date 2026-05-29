import { useTheme } from '../context/ThemeContext';

import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

import styles from './Landing.module.css';

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [counts, setCounts] = useState({ students: 0, teachers: 0, questions: 0 });
  const [heroParallax, setHeroParallax] = useState({ x: 0, y: 0 });
  const [scrolled, setScrolled] = useState(false);

  /* Canvas particle network */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const ctx = canvas.getContext('2d')!;
    const pts = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      r: Math.random() * 1.8 + 0.5,
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const light = document.documentElement.getAttribute('data-theme') === 'light';
      pts.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, light ? p.r * 1.5 : p.r, 0, Math.PI * 2);
        ctx.fillStyle = light ? 'rgba(200,149,46,0.35)' : 'rgba(99,102,241,0.55)';
        ctx.fill();
        for (let j = i + 1; j < pts.length; j++) {
          const p2 = pts[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 130) {
            ctx.beginPath();
            ctx.strokeStyle = light ? `rgba(200,149,46,${0.15 - dist / 800})` : `rgba(99,102,241,${0.15 - dist / 800})`;
            ctx.lineWidth = light ? 1.5 : 0.7;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  /* Scroll nav shadow */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* Mouse parallax */
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      setHeroParallax({
        x: (e.clientX / window.innerWidth - 0.5) * 22,
        y: (e.clientY / window.innerHeight - 0.5) * 22,
      });
    };
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, []);

  /* Scroll reveal */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add(styles.visible); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(`.${styles.reveal}`).forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* Counter animation */
  useEffect(() => {
    const targets = { students: 10000, teachers: 500, questions: 1000000 };
    const dur = 2200;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setCounts({
        students: Math.floor(e * targets.students),
        teachers: Math.floor(e * targets.teachers),
        questions: Math.floor(e * targets.questions),
      });
      if (p < 1) requestAnimationFrame(tick);
    };
    const t = setTimeout(tick, 600);
    return () => clearTimeout(t);
  }, []);

  /* Card tilt */
  // @ts-expect-error reserved for future use
  const tilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x * 18}deg) rotateX(${-y * 18}deg) translateZ(8px)`;
  };
  // @ts-expect-error reserved for future use
  const resetTilt = (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = ''; };

  return (
    <main className={styles.wrapper}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />

      {/* ── Nav ── */}
      <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.navLogo}>
          <img src="/logo.jpg" alt="Logo" className={styles.navLogoIcon} style={{ width: '32px', height: '32px', background: '#fff', borderRadius: '6px', padding: '2px', objectFit: 'contain' }} />
          <span className={styles.navLogoText}>AI Classroom</span>
        </div>
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>Features</a>
          <a href="#how" className={styles.navLink}>How it works</a>
          <a href="#insights" className={styles.navLink}>Insights</a>
          <a href="#workflow" className={styles.navLink}>Workflow</a>
          <button id="theme-toggle" onClick={toggleTheme} className={styles.themeToggle} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link to="/tenant-access" className={`${styles.btn} ${styles['btn-secondary']}`}>Log in</Link>
          <Link to="/tenant-access" className={`${styles.btn} ${styles['btn-primary']}`}>Get Started</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>✨ AI-Powered Education Platform</div>
          <h1 className={styles.heroTitle}>
            The Future of<br />
            <span className={styles.gradientText}>Smart Learning</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Generate unique AI-powered assessments for every student.
            Track performance in real-time. Elevate your classroom to the next level.
          </p>
          <div className={styles.heroCta}>
            <Link to="/tenant-access" className={`${styles.btn} ${styles['btn-primary']} ${styles['btn-lg']}`}>Start for Free →</Link>
            <Link to="/tenant-access" className={`${styles.btn} ${styles['btn-secondary']} ${styles['btn-lg']}`}>Sign In</Link>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>{counts.students >= 10000 ? '10k+' : counts.students.toLocaleString()}</span>
              <span className={styles.heroStatLabel}>Students</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>{counts.teachers >= 500 ? '500+' : counts.teachers}</span>
              <span className={styles.heroStatLabel}>Teachers</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>{counts.questions >= 1000000 ? '1M+' : `${Math.floor(counts.questions / 1000)}k`}</span>
              <span className={styles.heroStatLabel}>Questions Generated</span>
            </div>
          </div>
        </div>

        {/* 3D Visual */}
        <div
          className={styles.heroVisual}
          style={{ transform: `perspective(1200px) rotateY(${heroParallax.x * 0.28}deg) rotateX(${-heroParallax.y * 0.28}deg)` }}
        >
          <div className={styles.scene3d}>
            <div className={`${styles.floatCard} ${styles.floatCard1}`}>
              <div className={styles.floatCardHeader}><span>📊</span> Attendance Tracker</div>
              <p className={styles.floatCardText}>87% attendance today across 6 classes</p>
              <div className={styles.floatCardProgress}>
                <div className={styles.floatCardProgressFill} style={{ width: '87%' }} />
              </div>
              <div className={styles.floatCardTags}>
                <span className={styles.tag}>Live</span>
                <span className={styles.tag}>142 Present</span>
              </div>
            </div>

            <div className={`${styles.floatCard} ${styles.floatCard2}`}>
              <div className={styles.floatCardHeader}><span>📊</span> Class Analytics</div>
              <div className={styles.floatCardStat}>
                <span className={styles.floatCardStatNum}>87%</span>
                <span className={styles.floatCardStatLabel}>Avg Score</span>
              </div>
              <div className={styles.chartBar}>
                {[60, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>

            <div className={`${styles.floatCard} ${styles.floatCard3}`}>
              <div className={styles.floatCardHeader}><span>⏱️</span> Live Test</div>
              <div className={styles.liveIndicator}><span className={styles.liveDot} />LIVE</div>
              <p className={styles.floatCardText}>24 students taking test now</p>
              <div className={styles.studentAvatars}>
                {['A','B','C','D'].map((l, i) => (
                  <div key={i} className={styles.avatar}>{l}</div>
                ))}
                <div className={styles.avatar}>20+</div>
              </div>
            </div>

            <div className={`${styles.floatCard} ${styles.floatCard4}`}>
              <div className={styles.floatCardHeader}><span>🏆</span> Top Student</div>
              <p className={styles.floatCardText}>Sarah K. — 98/100</p>
              <span className={styles.rankBadge}>🥇 #1</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className={styles.features}>
        <div className={`${styles.sectionHeader} ${styles.reveal}`}>
          <h2 className={styles.sectionTitle}>
            Everything you need to <span className={styles.gradientText}>teach smarter</span>
          </h2>
          <p className={styles.sectionSubtitle}>Built for modern educators and learners</p>
        </div>
        <div className={styles.featuresGrid}>
          {features.map((f, i) => (
            <div
              key={i}
              className={`${styles.featureCardWrap} ${styles.reveal}`}
              style={{ transitionDelay: `${i * 0.07}s` }}
            >
              <div className={styles.featureCard}>
                <div className={styles.featureCardFront}>
                  <div className={styles.featureIconBg}>{f.icon}</div>
                  <h3 className={styles.featureTitle}>{f.title}</h3>
                  <span className={styles.featureTag}>{f.tag}</span>
                </div>
                <div className={styles.featureCardBack}>
                  <div className={styles.featureIconBg}>{f.icon}</div>
                  <h3 className={styles.featureTitle}>{f.title}</h3>
                  <p className={styles.featureText}>{f.text}</p>
                  <span className={styles.featureTag}>{f.tag}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how" className={styles.howSection}>
        <div className={`${styles.sectionHeader} ${styles.reveal}`}>
          <h2 className={styles.sectionTitle}>How it <span className={styles.gradientText}>works</span></h2>
          <p className={styles.sectionSubtitle}>Up and running in 4 simple steps</p>
        </div>
        <div className={styles.stepsGrid}>
          {steps.map((s, i) => (
            <div key={i} className={`${styles.stepCard} ${styles.reveal}`} style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className={styles.stepNum}>{i + 1}</div>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepText}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── About / Why Choose Us ── */}
      <section id="about" className={styles.aboutSection}>
        <div className={styles.aboutContainer}>
          <div className={`${styles.aboutContent} ${styles.reveal}`}>
            <h2 className={styles.sectionTitle}>Built for <span className={styles.gradientText}>Educators</span></h2>
            <p className={styles.aboutText}>
              We believe that teachers should spend their time teaching, not grading or writing repetitive questions.
              Our platform uses advanced AI models to generate customized learning paths, instant assessments, and
              comprehensive performance analytics, enabling a truly personalized educational experience for every student.
            </p>
            <ul className={styles.aboutList}>
              <li>✨ Save 15+ hours a week on grading and planning.</li>
              <li>✨ Identify at-risk students instantly with predictive AI.</li>
              <li>✨ Ensure secure, proctored examinations anywhere.</li>
            </ul>
          </div>
          <div className={`${styles.aboutVisual} ${styles.reveal}`}>
            <div className={styles.aboutImageGlow} />
            <div className={styles.aboutImageMock}>
              <div className={styles.mockHeader}>
                 <span/><span/><span/>
              </div>
              <div className={styles.mockBody}>
                 <h3>AI Analysis Complete</h3>
                 <p>Student engagement is up by 24% this week.</p>
                 <div className={styles.mockBar} style={{width:'80%'}}></div>
                 <div className={styles.mockBar} style={{width:'60%'}}></div>
                 <div className={styles.mockBar} style={{width:'90%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Insights & Analytics ── */}
      <section id="insights" className={styles.insightsSection}>
        <div className={`${styles.sectionHeader} ${styles.reveal}`}>
          <h2 className={styles.sectionTitle}>Deep <span className={styles.gradientText}>Insights</span></h2>
          <p className={styles.sectionSubtitle}>Turn data into actionable teaching strategies</p>
        </div>
        <div className={styles.insightsGrid}>
          <div className={`${styles.insightCard} ${styles.reveal}`} style={{ transitionDelay: '0s' }}>
            <div className={styles.insightIcon}>🎯</div>
            <h3>Skill Tracking</h3>
            <p>Monitor individual student mastery of specific topics and automatically suggest targeted revision materials.</p>
          </div>
          <div className={`${styles.insightCard} ${styles.reveal}`} style={{ transitionDelay: '0.1s' }}>
            <div className={styles.insightIcon}>📈</div>
            <h3>Class Trends</h3>
            <p>Analyze overall class performance to identify common bottlenecks in your curriculum and adjust your pacing.</p>
          </div>
          <div className={`${styles.insightCard} ${styles.reveal}`} style={{ transitionDelay: '0.2s' }}>
            <div className={styles.insightIcon}>🧠</div>
            <h3>Predictive Analytics</h3>
            <p>Our AI predicts final grades with 94% accuracy, allowing you to intervene before it's too late.</p>
          </div>
        </div>
      </section>

      {/* ── Workflow / Integrations ── */}
      <section id="workflow" className={styles.workflowSection}>
        <div className={styles.workflowContainer}>
          <div className={`${styles.workflowVisual} ${styles.reveal}`}>
            <div className={styles.orbitRing}>
              <div className={styles.orbitIcon} style={{ '--i': 0 } as React.CSSProperties}>📊</div>
              <div className={styles.orbitIcon} style={{ '--i': 1 } as React.CSSProperties}>🤖</div>
              <div className={styles.orbitIcon} style={{ '--i': 2 } as React.CSSProperties}>📝</div>
              <div className={styles.orbitIcon} style={{ '--i': 3 } as React.CSSProperties}>🎓</div>
              <div className={styles.orbitIcon} style={{ '--i': 4 } as React.CSSProperties}>🔐</div>
              <div className={styles.orbitIcon} style={{ '--i': 5 } as React.CSSProperties}>⏱️</div>
            </div>
            <div className={styles.orbitCenter}>
              <img src="/logo.jpg" alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'contain' }} />
            </div>
          </div>
          <div className={`${styles.workflowContent} ${styles.reveal}`}>
            <div className={styles.heroBadge}>⚡ Seamless Workflow</div>
            <h2 className={styles.sectionTitle}>
              <span className={styles.gradientText}>Integrate</span> with your<br/>Teaching Workflow
            </h2>
            <p className={styles.aboutText}>
              Easily connect AI Classroom with your existing tools for a seamless experience.
            </p>
            <ul className={styles.aboutList}>
              <li>✅ Works with Google Classroom &amp; LMS platforms</li>
              <li>✅ Export results as PDF or CSV instantly</li>
              <li>✅ Sync student data across all dashboards</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <div className={`${styles.ctaCard} ${styles.reveal}`}>
          <div className={styles.ctaGlow} />
          <span className={styles.ctaBadge}>🚀 Join Today — It&apos;s Free</span>
          <h2 className={styles.ctaTitle}>Ready to transform your classroom?</h2>
          <p className={styles.ctaText}>Join thousands of educators using AI to create better assessments.</p>
          <div className={styles.ctaButtons}>
            <Link to="/tenant-access" className={`${styles.btn} ${styles['btn-primary']} ${styles['btn-lg']}`}>Get Started Free →</Link>
            <Link to="/tenant-access" className={`${styles.btn} ${styles['btn-secondary']} ${styles['btn-lg']}`}>Sign In</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer 
        className={styles.footerWrap}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          e.currentTarget.style.setProperty('--x', `${x}px`);
          e.currentTarget.style.setProperty('--y', `${y}px`);
        }}
      >
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <div className={styles.footerBrandLogo}>
              <img src="/logo.jpg" alt="Logo" style={{ width: '36px', height: '36px', background: '#fff', borderRadius: '8px', padding: '2px', objectFit: 'contain' }} />
              <span className={styles.fontDisplay}>AI Classroom</span>
            </div>
            <p className={styles.footerBrandText}>
              Transform your classroom with AI-powered assessments, real-time analytics,
              and personalized learning paths for every student.
            </p>
          </div>
          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>Product</h4>
            <a href="#features" className={styles.footerGlowLink}>Features</a>
            <a href="#how" className={styles.footerGlowLink}>How it Works</a>
            <a href="#insights" className={styles.footerGlowLink}>Insights</a>
            <a href="#about" className={styles.footerGlowLink}>About</a>
          </div>
          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>Resources</h4>
            <a href="#" className={styles.footerGlowLink}>Documentation</a>
            <a href="#" className={styles.footerGlowLink}>API Reference</a>
            <a href="#" className={styles.footerGlowLink}>Help Center</a>
            <a href="#" className={styles.footerGlowLink}>Community</a>
          </div>
          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>Company</h4>
            <a href="#" className={styles.footerGlowLink}>Privacy Policy</a>
            <a href="#" className={styles.footerGlowLink}>Terms of Service</a>
            <a href="#" className={styles.footerGlowLink}>Contact Us</a>
            <a href="#" className={styles.footerGlowLink}>Careers</a>
          </div>
          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>Connect</h4>
            <a href="#" className={styles.footerGlowLink}>LinkedIn</a>
            <a href="#" className={styles.footerGlowLink}>Instagram</a>
            <a href="#" className={styles.footerGlowLink}>Twitter / X</a>
            <a href="#" className={styles.footerGlowLink}>GitHub</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span className={styles.footerText}>© 2026 AI Classroom · All rights reserved.</span>
          <span className={styles.footerText}>Terms &amp; Conditions</span>
        </div>
      </footer>
    </main>
  );
}

const features = [
  { icon: '🤖', title: 'AI Question Generation', text: 'Instantly generate MCQs and short-answer questions from any lecture content using Gemini AI.', tag: 'Powered by Gemini' },
  { icon: '🎲', title: 'Unique Test Sets', text: 'Every student receives a different, randomized question set — eliminating cheating at scale.', tag: 'Anti-Cheat' },
  { icon: '📊', title: 'Real-time Analytics', text: 'Track class performance, topic mastery, and submission trends with live dashboards.', tag: 'Live Data' },
  { icon: '⏱️', title: 'Timed Assessments', text: 'Set time limits, detect tab switching, and flag suspicious behaviour automatically.', tag: 'Proctored' },
  { icon: '🔐', title: 'Role-Based Access', text: 'Separate dashboards for Admins, Teachers, and Students with secure JWT authentication.', tag: 'Secure' },
  { icon: '📱', title: 'Fully Responsive', text: 'Works seamlessly across desktop, tablet, and mobile devices with a polished UI.', tag: 'Mobile-First' },
  { icon: '📅', title: 'Attendance Recording', text: 'Automatically track and monitor student attendance for every lecture with real-time percentage updates.', tag: 'Auto-Track' },
  { icon: '✨', title: 'No Internal Marks Stress', text: 'Continuous AI-based evaluation removes the pressure of internal marks — performance is tracked automatically.', tag: 'AI Evaluated' },
];

const steps = [
  { title: 'Create a Course', text: 'Teachers create a class and share a unique join code with students.' },
  { title: 'Upload Lecture Content', text: 'Paste your lecture notes or topic text into the content editor.' },
  { title: 'Generate with AI', text: 'Click "Generate Questions" — Gemini AI creates a rich question bank instantly.' },
  { title: 'Publish & Assess', text: 'Publish the test. Students get individually randomized question sets with a timer.' },
];
