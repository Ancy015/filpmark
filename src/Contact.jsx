import { useState } from 'react';

const CONTACT_CHANNELS = [
  {
    icon: '⌂',
    label: 'Head Office',
    value: 'Flipmark Warehouse, Green Avenue',
    note: 'Mumbai, India - 400001',
  },
  {
    icon: '✉',
    label: 'Email Us',
    value: 'support@flipmark.com',
    note: 'sales@flipmark.com',
  },
  {
    icon: '☎',
    label: 'Call Us',
    value: '+91 22-4567-8901',
    note: 'Mon-Sat, 9:00 AM to 7:00 PM',
  },
];

const SOCIAL_LINKS = ['f', 'ig', 'x', 'yt'];

const MAP_STYLE = {
  backgroundImage:
    "linear-gradient(rgba(12, 42, 92, 0.06), rgba(12, 42, 92, 0.06)), radial-gradient(circle at 20% 18%, rgba(71, 145, 255, 0.18) 0 3px, transparent 4px), linear-gradient(135deg, #eaf2fb 0%, #f7fbff 42%, #eef5fb 100%)",
  backgroundSize: 'auto, 120px 120px, auto',
};

function Contact({ onNavigateHome }) {
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setStatusMessage('Thanks for reaching out. Our team will get back to you shortly.');
  };

  return (
    <div className="contact-page-shell page-shell">
      <header className="contact-hero">
        <div className="contact-hero-overlay" />

        <div className="container contact-topbar">
          <div className="contact-brand">
            <div className="contact-brand-mark" aria-hidden="true">
              FM
            </div>
            <div className="brand-text">
              <span>FLIP</span>
              <strong>MARK</strong>
            </div>
          </div>

          <nav className="contact-nav" aria-label="Primary navigation">
            <button type="button" onClick={onNavigateHome}>Homepage</button>
            <button type="button" onClick={onNavigateHome}>About us</button>
            <button type="button" onClick={onNavigateHome}>Solutions</button>
            <button type="button" className="active" aria-current="page">Contact us</button>
            <button type="button" onClick={onNavigateHome}>Pages</button>
          </nav>

          <button type="button" className="contact-topbar-cta" onClick={onNavigateHome}>
            Get Started
          </button>
        </div>

        <div className="container contact-hero-copy-wrap">
          <p className="eyebrow contact-hero-eyebrow">Contact Flipmark</p>
          <h1>Fresh produce delivered with premium service and reliable support.</h1>
        </div>

        <div className="container contact-hero-subcopy">
          <p>Reach out for bulk orders, delivery questions, product availability, or wholesale partnerships.</p>
        </div>
      </header>

      <main>
        <section className="contact-panel-wrap">
          <div className="container contact-panel">
            <aside className="contact-info-column">
              <h2>Get in touch</h2>
              <p>
                We're here to help with your grocery needs, bulk orders, delivery updates, and special requests.
              </p>

              <div className="contact-channel-list compact">
                {CONTACT_CHANNELS.map((channel) => (
                  <div className="contact-channel-item compact" key={channel.label}>
                    <div className="contact-icon-badge" aria-hidden="true">
                      {channel.icon}
                    </div>
                    <div>
                      <span>{channel.label}</span>
                      <strong>{channel.value}</strong>
                      <small>{channel.note}</small>
                    </div>
                  </div>
                ))}
              </div>

              <div className="contact-social-block">
                <p>Follow our social media</p>
                <div className="contact-social-links" aria-label="Social media links">
                  {SOCIAL_LINKS.map((label) => (
                    <a href="#home" key={label} aria-label={label}>
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </aside>

            <form className="contact-form-column" onSubmit={handleSubmit}>
              <h2>Send us a message</h2>

              <div className="contact-form-grid contact-form-grid-two">
                <label>
                  Name
                  <input type="text" name="name" placeholder="Name" required />
                </label>
                <label>
                  Company
                  <input type="text" name="company" placeholder="Company" />
                </label>
                <label>
                  Phone
                  <input type="tel" name="phone" placeholder="Phone" />
                </label>
                <label>
                  Email
                  <input type="email" name="email" placeholder="Email" required />
                </label>
                <label className="contact-message-field contact-message-span">
                  Subject
                  <input type="text" name="subject" placeholder="Subject" required />
                </label>
                <label className="contact-message-field contact-message-span">
                  Message
                  <textarea
                    name="message"
                    rows="6"
                    placeholder="Message"
                    required
                  />
                </label>
              </div>

              <button type="submit" className="contact-form-submit">
                Send
              </button>

              {statusMessage && <p className="contact-status-message">{statusMessage}</p>}
            </form>
          </div>
        </section>

        <section className="contact-map-section" aria-label="Office map preview">
          <div className="contact-map-canvas" style={MAP_STYLE}>
            <div className="contact-map-card">
              <strong>Flipmark office</strong>
              <p>Central business district, Mumbai</p>
            </div>
          </div>
        </section>

        <footer className="contact-footer">
          <div className="container contact-footer-inner">
            <div className="contact-footer-brand">
              <div className="contact-brand-mark small" aria-hidden="true">
                FM
              </div>
              <div>
                <strong>flipmark</strong>
                <p>Fresh produce delivery with premium quality and trusted service.</p>
              </div>
            </div>

            <div className="contact-footer-links">
              <div>
                <h3>Head Office</h3>
                <p>Flipmark Warehouse</p>
                <p>Green Avenue, Mumbai 400001</p>
              </div>
              <div>
                <h3>Support</h3>
                <p>Order Help</p>
                <p>Delivery Status</p>
                <p>Product Info</p>
              </div>
              <div>
                <h3>Newsletter</h3>
                <p>Get fresh deals on organic produce straight to your inbox.</p>
                <div className="contact-newsletter">
                  <input type="email" placeholder="Email" aria-label="Email for newsletter" />
                  <button type="button">Subscribe</button>
                </div>
              </div>
            </div>

            <div className="contact-footer-bottom">
              <p>Copyright © 2026 Flipmark. All rights reserved.</p>
              <div className="contact-footer-legal">
                <a href="#home">Terms</a>
                <a href="#home">Privacy</a>
                <a href="#home">Return Policy</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default Contact;