import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface UserData {
  id: string;
  fullName: string;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
  elderCount: number;
}

interface UsersListProps {
  users: UserData[];
}

const tierColors: Record<string, string> = {
  premium: "default",
  pro: "secondary",
  basic: "outline",
};

const statusColors: Record<string, string> = {
  active: "default",
  trial: "secondary",
  expired: "destructive",
};

const UsersList = ({ users }: UsersListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">All Users</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Elders</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>
                    <Badge variant={tierColors[user.subscriptionTier || 'basic'] as any}>
                      {user.subscriptionTier || 'basic'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[user.subscriptionStatus || 'trial'] as any}>
                      {user.subscriptionStatus || 'trial'}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.elderCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UsersList;
