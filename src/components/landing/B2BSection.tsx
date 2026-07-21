import { useState } from "react";
import { Building2, Users, Calendar, BarChart3, Shield, HeadphonesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import B2BContactForm from "./B2BContactForm";

const features = [
  {
    icon: Calendar,
    title: "Flexible Call Scheduling",
    description: "Choose 7, 14, or 30 check-ins per month based on your facility's needs",
  },
  {
    icon: Users,
    title: "Centralized Resident Dashboard",
    description: "Monitor all residents from a single dashboard with cohort management",
  },
  {
    icon: BarChart3,
    title: "Compliance-Ready Reporting",
    description: "Detailed analytics and exportable reports for regulatory requirements",
  },
  {
    icon: Shield,
    title: "HIPAA-Friendly Infrastructure",
    description: "Secure data handling with proper access controls and audit logs",
  },
  {
    icon: HeadphonesIcon,
    title: "Dedicated Account Manager",
    description: "Personal support and onboarding assistance for your team",
  },
  {
    icon: Building2,
    title: "Custom Integration",
    description: "API access and integration with your existing healthcare systems",
  },
];

const B2BSection = () => {
  const [showContactForm, setShowContactForm] = useState(false);

  return (
    <section className="py-14 md:py-20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Building2 className="h-4 w-4" />
            Enterprise Solutions
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            For Hospitals & Elder Care Facilities
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Trusted by healthcare facilities across India. Custom solutions for monitoring multiple residents with flexible scheduling and comprehensive reporting.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300"
            >
              <div className="bg-primary/10 p-3 rounded-lg w-fit mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Card className="inline-block p-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <h3 className="text-xl font-semibold mb-2">Custom Pricing for Your Facility</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              No standard rates — we work with you to create a plan that fits your resident count, call frequency, and budget.
            </p>
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-base rounded-full gap-2"
              onClick={() => setShowContactForm(true)}
            >
              <HeadphonesIcon className="h-5 w-5" />
              Talk to Our Team
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              No commitment required • Response within 24 hours
            </p>
          </Card>
        </div>
      </div>

      <B2BContactForm 
        open={showContactForm} 
        onOpenChange={setShowContactForm} 
      />
    </section>
  );
};

export default B2BSection;