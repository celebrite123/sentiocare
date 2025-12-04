import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does the AI voice call work?",
    answer: "Sentio AI makes automated voice calls at scheduled times. The AI speaks naturally in Hindi or English, asks about medicines and well-being, and records responses. If any concern is detected, you're immediately alerted.",
  },
  {
    question: "What if my parent doesn't answer the call?",
    answer: "If a call is missed, the AI will retry after 15 minutes. If still no answer, you'll receive an alert so you can follow up. We also support WhatsApp as a backup channel.",
  },
  {
    question: "Is my family's health data secure?",
    answer: "Absolutely. All data is encrypted and stored securely. We're HIPAA-compliant and never share your data with third parties. You can delete all data anytime.",
  },
  {
    question: "Can I customize the check-in schedule?",
    answer: "Yes! You can set specific times for calls and WhatsApp messages, choose which days, and even set different schedules for medicines vs general wellness checks.",
  },
  {
    question: "Do you support multiple languages?",
    answer: "Currently we support English and Hindi. We're actively working on adding Tamil, Telugu, Marathi, Bengali, and other Indian languages.",
  },
  {
    question: "What happens during the free trial?",
    answer: "You get full access to all Premium features for 14 days. No credit card required. After the trial, you can choose a plan that fits your needs or continue with basic free features.",
  },
];

const FAQSection = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Frequently Asked <span className="text-primary">Questions</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about Sentio AI
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-2 rounded-xl px-6 bg-card data-[state=open]:border-primary/50 transition-colors"
              >
                <AccordionTrigger className="text-left text-lg font-medium hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 text-base leading-relaxed">
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
