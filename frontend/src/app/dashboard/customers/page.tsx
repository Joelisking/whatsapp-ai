'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { customersAPI } from '@/lib/api';
import { User, Phone, Mail, MessageSquare, ShoppingBag, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm]);

  const fetchCustomers = async () => {
    try {
      const params = searchTerm ? { search: searchTerm } : {};
      const response = await customersAPI.getAll(params);
      setCustomers(response.data.customers);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">View and manage your customer base</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Customers</CardTitle>
            <CardDescription>
              {customers.length} {customers.length === 1 ? 'customer' : 'customers'} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search customers..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Conversations</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        {searchTerm
                          ? 'No customers found matching your search.'
                          : 'No customers yet. Customers will appear here after their first interaction.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {customer.name || 'Unknown'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ID: {customer.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{customer.phoneNumber}</span>
                            </div>
                            {customer.email && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                <span>{customer.email}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="secondary">
                              {customer._count?.orders || 0}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="secondary">
                              {customer._count?.conversations || 0}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
