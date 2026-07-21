import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import sentioLogo from "@/assets/sentio-logo-new.png";

const TermsOfService = () => {
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
            <img src={sentioLogo} alt="Sentio AI" className="h-8 w-auto" />
            <span className="text-xl font-bold">Sentio AI</span>
          </div>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 6, 2026</p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Sentio AI's services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
            <p>
              Sentio AI provides an AI-powered elder care monitoring service that includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Automated voice calls to check on elderly individuals</li>
              <li>WhatsApp-based health check-ins</li>
              <li>AI-powered conversation analysis</li>
              <li>Health monitoring and alert systems</li>
              <li>Medication reminder tracking</li>
              <li>Caregiver notification services</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">3. User Responsibilities</h2>
            <p>As a user of Sentio AI, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate and complete information about yourself and the elders you register</li>
              <li>Obtain proper consent from elders before registering them for our services</li>
              <li>Keep your account credentials secure</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Not use the service for any unlawful purposes</li>
              <li>Maintain updated emergency contact information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">4. Consent for Elders</h2>
            <p>
              By registering an elder on our platform, you represent and warrant that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You have legal authority to act on behalf of the elder, or</li>
              <li>The elder has given informed consent to receive AI-powered health check-ins</li>
              <li>You have explained the nature of the service to the elder</li>
              <li>The elder understands that calls and messages will be from an AI assistant</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">5. Medical Disclaimer</h2>
            <p className="font-medium text-destructive">
              IMPORTANT: Sentio AI is NOT a medical service and does NOT provide medical advice, diagnosis, or treatment.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Our service is designed for wellness monitoring and communication only</li>
              <li>Alerts and insights are AI-generated and may not be accurate</li>
              <li>Always consult qualified healthcare professionals for medical decisions</li>
              <li>In case of medical emergencies, call emergency services (112 in India) immediately</li>
              <li>Do not rely solely on our service for critical health monitoring</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">6. Subscription and Billing</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Free trial: 30 days with all Premium features</li>
              <li>Basic Plan: ₹299/month per elder (WhatsApp only)</li>
              <li>Premium Plan: ₹699/month per elder (Voice + WhatsApp)</li>
              <li>Billing occurs monthly on the date of subscription</li>
              <li>You may cancel your subscription at any time</li>
              <li>Refunds are provided pro-rata for unused periods</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">7. Service Availability</h2>
            <p>
              We strive to maintain high service availability but do not guarantee uninterrupted service. Scheduled maintenance and unforeseen issues may cause temporary disruptions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Sentio AI shall not be liable for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Any indirect, incidental, or consequential damages</li>
              <li>Damages resulting from missed alerts or failed communications</li>
              <li>Medical emergencies not detected or improperly assessed by our AI</li>
              <li>Actions taken based on AI-generated insights</li>
              <li>Data breaches caused by factors beyond our reasonable control</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">9. Intellectual Property</h2>
            <p>
              All content, features, and functionality of Sentio AI are owned by us and protected by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">10. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account if you violate these Terms of Service. You may terminate your account at any time by contacting our support team.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">11. Governing Law</h2>
            <p>
              These Terms of Service shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Bangalore, India.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">12. Changes to Terms</h2>
            <p>
              We may modify these Terms of Service at any time. We will notify you of significant changes via email or through our service. Continued use of the service after changes constitutes acceptance of the modified terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">13. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us at:
            </p>
            <ul className="list-none mt-4">
              <li><strong>Email:</strong> legal@sentio-ai.com</li>
              <li><strong>Address:</strong> Sentio AI Healthcare Pvt. Ltd., India</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
