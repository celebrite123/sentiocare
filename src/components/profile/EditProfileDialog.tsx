import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, User, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  phone_number: z.string().min(10, "Enter a valid phone number").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProfile: {
    full_name: string;
    phone_number: string | null;
  } | null;
  onProfileUpdated: () => void;
}

const EditProfileDialog = ({ 
  open, 
  onOpenChange, 
  currentProfile,
  onProfileUpdated 
}: EditProfileDialogProps) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: currentProfile?.full_name || "",
      phone_number: currentProfile?.phone_number || "",
    },
  });

  useEffect(() => {
    if (currentProfile) {
      form.reset({
        full_name: currentProfile.full_name || "",
        phone_number: currentProfile.phone_number || "",
      });
    }
  }, [currentProfile, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: values.full_name,
          phone_number: values.phone_number || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated ✓",
        description: "Your profile has been updated successfully.",
      });

      onProfileUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Failed to Update Profile",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Update your account information
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="+91 98765 43210"
                        className="pl-10"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <User className="h-4 w-4" />
              )}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;