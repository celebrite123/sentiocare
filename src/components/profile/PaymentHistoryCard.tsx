import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CreditCard, Receipt, Download, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Payment {
  id: string;
  amount: number;
  currency: string | null;
  plan_id: string;
  status: string;
  is_auto_renewal: boolean | null;
  created_at: string;
  razorpay_payment_id: string;
}

const PaymentHistoryCard = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPayments();
    }
  }, [user]);

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_history")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanName = (planId: string) => {
    switch (planId) {
      case "premium":
        return "Premium";
      case "basic":
        return "Basic";
      default:
        return planId;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadPayments}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No payment history yet</p>
            <p className="text-sm">Your transactions will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm">
                      {format(new Date(payment.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getPlanName(payment.plan_id)}
                    </TableCell>
                    <TableCell>
                      ₹{payment.amount}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payment.is_auto_renewal ? (
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          Auto
                        </span>
                      ) : (
                        "Manual"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentHistoryCard;