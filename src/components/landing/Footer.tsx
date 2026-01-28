import { Link } from "react-router-dom";
import sentioLogo from "@/assets/sentio-logo-new.png";

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img 
              src={sentioLogo} 
              alt="Sentio AI" 
              className="h-10 w-auto"
              width={40}
              height={40}
              loading="lazy"
            />
          </div>

          <nav className="flex flex-wrap justify-center gap-6 text-sm text-foreground/70">
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/contact-us" className="hover:text-foreground transition-colors">Contact Us</Link>
            <Link to="/cancellation-refund" className="hover:text-foreground transition-colors">Cancellation & Refund</Link>
          </nav>

          <p className="text-sm text-foreground/60">
            © 2026 Sentio AI. Made with ❤️ in India
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
