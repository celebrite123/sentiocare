import { Link } from "react-router-dom";
import { Mail, MessageCircle } from "lucide-react";
import sentioLogo from "@/assets/sentio-logo-new.png";

const Footer = () => {
  return (
    <footer className="pt-16 pb-10 border-t border-border bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 mb-12">
          <div>
            <img
              src={sentioLogo}
              alt="Sentio"
              className="h-10 w-auto mb-4"
              width={40}
              height={40}
              loading="lazy"
            />
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Daily AI care calls in Hindi &amp; English — so your parents are never alone on the call.
            </p>
          </div>

          <div>
            <p className="text-xs tracking-[0.15em] uppercase text-foreground mb-3">Product</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
              <li><Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs tracking-[0.15em] uppercase text-foreground mb-3">Company</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/contact-us" className="hover:text-foreground transition-colors">Contact</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy</Link></li>
              <li><Link to="/terms-of-service" className="hover:text-foreground transition-colors">Terms</Link></li>
              <li><Link to="/cancellation-refund" className="hover:text-foreground transition-colors">Refunds</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs tracking-[0.15em] uppercase text-foreground mb-3">Reach us</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://wa.me/919876543210?text=Hi%2C%20I%27m%20interested%20in%20Sentio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@sentio.in.net"
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" /> hello@sentio.in.net
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Sentio. Made with care in India.</p>
          <p className="font-serif italic text-sm">"So you can rest, knowing they're heard."</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
