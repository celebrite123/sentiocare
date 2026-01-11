import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin, Clock } from "lucide-react";
import sentioLogo from "@/assets/sentio-logo.png";

const ContactUs = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <img src={sentioLogo} alt="Sentio AI" className="h-8 w-auto" />
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Contact Us</h1>
        
        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p className="text-xl mb-8">
            We're here to help! Whether you have questions about our services, need support, 
            or want to learn more about how Sentio AI can help care for your loved ones, 
            we'd love to hear from you.
          </p>

          <div className="grid md:grid-cols-2 gap-8 my-12">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Email Us</h3>
              </div>
              <p className="text-muted-foreground mb-2">For general inquiries and support:</p>
              <a 
                href="mailto:info@sentio.in.net" 
                className="text-primary hover:underline font-medium"
              >
                info@sentio.in.net
              </a>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Call Us</h3>
              </div>
              <p className="text-muted-foreground mb-2">Speak with our team directly:</p>
              <a 
                href="tel:+919876543210" 
                className="text-primary hover:underline font-medium"
              >
                +91 98765 43210
              </a>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Location</h3>
              </div>
              <p className="text-muted-foreground">
                Based in India, serving families worldwide with AI-powered elder care solutions.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Response Time</h3>
              </div>
              <p className="text-muted-foreground">
                We typically respond within 24-48 hours on business days.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mt-12 mb-4 text-foreground">How Can We Help?</h2>
          
          <ul className="space-y-3 list-disc pl-6">
            <li><strong>Product Questions:</strong> Learn more about our voice and WhatsApp check-in features</li>
            <li><strong>Technical Support:</strong> Get help with your account or app issues</li>
            <li><strong>Billing Inquiries:</strong> Questions about subscriptions, payments, or refunds</li>
            <li><strong>Partnerships:</strong> Explore collaboration opportunities</li>
            <li><strong>Feedback:</strong> Share your experience and suggestions</li>
          </ul>

          <div className="bg-muted/50 rounded-xl p-6 mt-12">
            <h3 className="text-xl font-semibold text-foreground mb-3">Need Immediate Assistance?</h3>
            <p className="text-muted-foreground">
              For urgent matters related to elder care alerts or safety concerns, 
              please email us with "URGENT" in the subject line, and we'll prioritize your request.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ContactUs;
