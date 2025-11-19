'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { analyticsAPI, productsAPI } from '@/lib/api';
import { Package, ShoppingCart, Users, MessageSquare, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, productsRes] = await Promise.all([
        analyticsAPI.get(),
        productsAPI.getAll(),
      ]);
      setAnalytics(analyticsRes.data);
      setProducts(productsRes.data.products || []);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const stats = [
    {
      name: 'Total Revenue',
      value: `$${analytics?.orders?.revenue?.toFixed(2) || 0}`,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      name: 'Total Orders',
      value: analytics?.orders?.total || 0,
      icon: ShoppingCart,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Customers',
      value: analytics?.customers?.total || 0,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      name: 'Active Conversations',
      value: analytics?.conversations?.active || 0,
      icon: MessageSquare,
      color: 'bg-yellow-500',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your WhatsApp AI Chatbot admin panel</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Product Inventory Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Product Inventory</CardTitle>
              <CardDescription>
                Overview of all products with pricing and stock levels
              </CardDescription>
            </div>
            <Link href="/dashboard/products">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock Remaining</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No products found. Add products to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.slice(0, 10).map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              {product.description && (
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {product.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{product.category || 'Uncategorized'}</TableCell>
                        <TableCell className="font-medium">
                          {product.currency} {product.price.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                product.stock <= 10
                                  ? 'text-destructive font-medium'
                                  : product.stock <= 50
                                  ? 'text-yellow-600 font-medium'
                                  : 'text-foreground'
                              }
                            >
                              {product.stock} units
                            </span>
                            {product.stock <= 10 && (
                              <Badge variant="destructive" className="text-xs">
                                Low Stock
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.isActive ? 'default' : 'secondary'}>
                            {product.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {products.length > 10 && (
              <div className="mt-4 text-center">
                <Link href="/dashboard/products">
                  <Button variant="outline">
                    View All {products.length} Products
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Status & Popular Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Status */}
          <Card>
            <CardHeader>
              <CardTitle>Orders by Status</CardTitle>
              <CardDescription>Breakdown of order statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {analytics?.orders?.byStatus?.map((status: any) => (
                  <div key={status.status} className="text-center p-4 rounded-lg border bg-muted/50">
                    <p className="text-2xl font-bold">{status._count}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {status.status.toLowerCase().replace('_', ' ')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Popular Products */}
          <Card>
            <CardHeader>
              <CardTitle>Popular Products</CardTitle>
              <CardDescription>Top selling products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics?.popularProducts?.length > 0 ? (
                  analytics.popularProducts.slice(0, 5).map((item: any) => (
                    <div
                      key={item.product?.id}
                      className="flex items-center justify-between py-3 border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{item.product?.name}</p>
                          <p className="text-sm text-muted-foreground">{item.orderCount} orders</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{item.totalQuantity} units sold</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">No sales data yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alert */}
        {analytics?.lowStockProducts?.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <CardTitle className="text-destructive">Low Stock Alert</CardTitle>
                  <CardDescription>Products that need restocking</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.lowStockProducts.slice(0, 5).map((product: any) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-background"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <Badge variant="destructive">
                      Only {product.stock} units left
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
