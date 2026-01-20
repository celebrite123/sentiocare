import { Link } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/auth">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Sentio AI</span>
          </div>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 6, 2026</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
            <p>
              Sentio AI ("we," "our," or "us") is committed to protecting your privacy and the privacy of the elderly
              individuals ("Elders") you care for. This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our AI-powered elder care service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-medium mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name, email address, and phone number of caregivers</li>
              <li>Elder's name, age, phone number, and emergency contacts</li>
              <li>Health information including medical conditions and medications</li>
              <li>Check-in preferences and scheduling information</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 mt-4">Health Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Voice call recordings and transcripts</li>
              <li>WhatsApp conversation history</li>
              <li>Well-being scores and sentiment analysis</li>
              <li>Medication adherence information</li>
              <li>Reported symptoms and health concerns</li>
            </ul>

            <h3 className="text-lg font-medium mb-2 mt-4">Usage Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>App usage patterns and preferences</li>
              <li>Device information and browser type</li>
              <li>IP address and location data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide AI-powered health check-ins via voice calls and WhatsApp</li>
              <li>To analyze conversations and detect potential health concerns</li>
              <li>To send alerts and notifications to caregivers</li>
              <li>To improve our AI models and service quality</li>
              <li>To communicate service updates and important information</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>End-to-end encryption for all communications</li>
              <li>Secure data storage with access controls</li>
              <li>Regular security audits and monitoring</li>
              <li>Compliance with healthcare data protection standards</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Data Sharing</h2>
            <p>We may share your information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Authorized caregivers and family members you designate</li>
              <li>Emergency services when critical health concerns are detected</li>
              <li>Service providers who assist in operating our platform (under strict confidentiality agreements)</li>
              <li>Legal authorities when required by law</li>
            </ul>
            <p className="mt-4">We do not sell your personal information to third parties.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent at any time</li>
              <li>Opt-out of marketing communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide services. Health records
              are retained according to applicable healthcare regulations. You may request deletion of your account and
              associated data at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Children's Privacy</h2>
            <p>
              Our service is designed for adult caregivers and elderly individuals. We do not knowingly collect
              information from children under 18.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
              policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Contact Us</h2>
            <p>If you have questions about this Privacy Policy or our data practices, please contact us at:</p>
            <ul className="list-none mt-4">
              <li>
                <strong>Email:</strong> info@sentio.in.net
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
