import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does the AI make phone calls?",
    answer: "Our AI uses advanced voice synthesis to make natural-sounding calls. The voice is warm and conversational, specifically designed to put elderly users at ease. Calls typically last 2-5 minutes and cover health, medication, and general wellbeing.",
  },
  {
    question: "What languages are supported?",
    answer: "Currently, we support English and Hindi for both voice calls and WhatsApp messages. We're working on adding more regional Indian languages soon, including Tamil, Telugu, and Bengali.",
  },
  {
    question: "What if my parent doesn't answer the call?",
    answer: "If a call isn't answered, we'll try again after 30 minutes. If still no response, we send a WhatsApp message. After 3 missed attempts, you'll receive an alert so you can check in personally.",
  },
  {
    question: "Is my family's health data secure?",
    answer: "Absolutely. We're HIPAA-compliant and use end-to-end encryption for all data. Health information is never shared with third parties and you can request complete data deletion at any time.",
  },
  {
    question: "Can I customize the check-in questions?",
    answer: "Yes! You can set specific health conditions to monitor, add custom questions, and adjust the check-in schedule. The AI adapts its conversation based on your loved one's profile.",
  },
  {
    question: "How do I cancel my subscription?",
    answer: "You can cancel anytime from your account settings. There are no cancellation fees. If you cancel, you'll retain access until the end of your billing period.",
  },
];

const FAQSection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
            Everything you need to know about Sentio AI
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-lg px-4 data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-foreground/75 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;