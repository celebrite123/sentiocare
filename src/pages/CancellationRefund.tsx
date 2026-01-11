import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import sentioLogo from "@/assets/sentio-logo.png";

const CancellationRefund = () => {
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
        <h1 className="text-4xl font-bold mb-8 text-foreground">Cancellation & Refund Policy</h1>
        
        <p className="text-lg text-muted-foreground mb-8">
          <strong>Last Updated:</strong> January 2026
        </p>

        <div className="prose prose-lg max-w-none text-muted-foreground">
          <p className="text-xl mb-8">
            At Sentio AI, we want you to be completely satisfied with our elder care services. 
            We offer a straightforward cancellation and refund policy to ensure transparency.
          </p>

          {/* Policy Summary Cards */}
          <div className="grid md:grid-cols-2 gap-6 my-12">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <h3 className="text-xl font-semibold text-green-800 dark:text-green-400">Within 7 Days</h3>
              </div>
              <p className="text-green-700 dark:text-green-300 font-medium text-lg">
                Full Refund – No Questions Asked
              </p>
              <p className="text-green-600 dark:text-green-400 mt-2">
                Cancel within 7 days of subscription and receive a complete refund with zero cancellation charges.
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
                <h3 className="text-xl font-semibold text-red-800 dark:text-red-400">After 7 Days</h3>
              </div>
              <p className="text-red-700 dark:text-red-300 font-medium text-lg">
                No Refund Available
              </p>
              <p className="text-red-600 dark:text-red-400 mt-2">
                Cancellations made after 7 days are not eligible for refunds, but you can continue using the service until your billing period ends.
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mt-12 mb-4 text-foreground">Detailed Policy</h2>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">1. Free Trial Period</h3>
          <p>
            All new users receive a <strong>14-day free trial</strong> of our Premium features. 
            During the trial period:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>No payment is required</li>
            <li>You can cancel at any time without any charges</li>
            <li>Full access to all Premium features including Voice and WhatsApp check-ins</li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">2. Cancellation Within 7 Days of Paid Subscription</h3>
          <p>
            If you cancel your paid subscription within <strong>7 days</strong> of the payment date:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You will receive a <strong>full refund</strong> of the subscription amount</li>
            <li>No cancellation charges will be applied</li>
            <li>Refunds will be processed within 5-7 business days</li>
            <li>The refund will be credited to the original payment method</li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">3. Cancellation After 7 Days</h3>
          <p>
            If you cancel your subscription after <strong>7 days</strong> from the payment date:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>No refund</strong> will be provided for the current billing period</li>
            <li>Your subscription will remain active until the end of the current billing cycle</li>
            <li>You can continue using all features until the subscription expires</li>
            <li>Auto-renewal will be stopped, and no future charges will be made</li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">4. How to Cancel</h3>
          <p>To cancel your subscription:</p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Log in to your Sentio AI account</li>
            <li>Navigate to your Profile settings</li>
            <li>Click on "Manage Subscription"</li>
            <li>Select "Cancel Subscription"</li>
            <li>Confirm your cancellation</li>
          </ol>
          <p className="mt-4">
            Alternatively, you can email us at{" "}
            <a href="mailto:info@sentio.in.net" className="text-primary hover:underline">
              info@sentio.in.net
            </a>{" "}
            with your account details and cancellation request.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">5. Refund Processing</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Eligible refunds are processed within <strong>5-7 business days</strong></li>
            <li>Refunds are credited to the original payment method</li>
            <li>Bank processing times may vary (additional 3-5 business days)</li>
            <li>You will receive an email confirmation once the refund is processed</li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">6. Exceptions</h3>
          <p>We may consider refund requests outside the standard policy in cases of:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Technical issues that prevented service usage (verified by our team)</li>
            <li>Duplicate charges or billing errors</li>
            <li>Service outages affecting your subscription period</li>
          </ul>
          <p className="mt-4">
            Such requests will be reviewed on a case-by-case basis. Please contact our support team with relevant details.
          </p>

          <div className="bg-muted/50 rounded-xl p-6 mt-12 flex gap-4">
            <AlertCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Questions?</h3>
              <p className="text-muted-foreground">
                If you have any questions about our cancellation and refund policy, please don't hesitate to contact us at{" "}
                <a href="mailto:info@sentio.in.net" className="text-primary hover:underline">
                  info@sentio.in.net
                </a>
                . We're here to help!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CancellationRefund;
