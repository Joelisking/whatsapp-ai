'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { ordersAPI } from '@/lib/api';
import { Eye, Package, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getAll();
      setOrders(response.data.orders);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const statusMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'secondary',
      CONFIRMED: 'default',
      PROCESSING: 'default',
      SHIPPED: 'default',
      DELIVERED: 'default',
      CANCELLED: 'destructive',
      REFUNDED: 'secondary',
    };
    return statusMap[status] || 'secondary';
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
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">Manage and track customer orders</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
            <CardDescription>
              {orders.length} {orders.length === 1 ? 'order' : 'orders'} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                        No orders found. Orders will appear here when customers make purchases.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="font-medium">{order.orderNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {order.customer.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-muted-foreground">{order.customer.phoneNumber}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.currency} {order.totalAmount}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={() => {
            setSelectedOrder(null);
            fetchOrders();
          }}
        />
      )}
    </DashboardLayout>
  );
}

function OrderDetailsModal({ order, onClose, onUpdate }: any) {
  const [status, setStatus] = useState(order.status);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await ordersAPI.updateStatus(order.id, status, trackingNumber || undefined);
      toast.success('Order updated successfully');
      onUpdate();
    } catch (error) {
      toast.error('Failed to update order');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Details - {order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            View and manage order information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{order.customer.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{order.customer.phoneNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{order.customer.email || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                    <div>
                      <div className="font-medium">{item.product.name}</div>
                      <div className="text-muted-foreground">Quantity: {item.quantity}</div>
                    </div>
                    <span className="font-medium">
                      {order.currency} {item.price * item.quantity}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-lg">{order.currency} {order.totalAmount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Order Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracking" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Tracking Number (optional)
              </Label>
              <Input
                id="tracking"
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Update Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
