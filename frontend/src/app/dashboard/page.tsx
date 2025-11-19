'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { analyticsAPI } from '@/lib/api';
import { Package, ShoppingCart, Users, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await analyticsAPI.get();
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome to your WhatsApp AI Chatbot admin panel</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Status */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Orders by Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {analytics?.orders?.byStatus?.map((status: any) => (
              <div key={status.status} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{status._count}</p>
                <p className="text-sm text-gray-600 capitalize">
                  {status.status.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Products */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Popular Products</h2>
          <div className="space-y-3">
            {analytics?.popularProducts?.slice(0, 5).map((item: any) => (
              <div key={item.product?.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center">
                  <Package className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{item.product?.name}</p>
                    <p className="text-sm text-gray-500">{item.orderCount} orders</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {item.totalQuantity} units sold
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        {analytics?.lowStockProducts?.length > 0 && (
          <div className="card bg-yellow-50 border-yellow-200">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="ml-3">
                <h2 className="text-lg font-semibold text-yellow-900 mb-2">Low Stock Alert</h2>
                <div className="space-y-2">
                  {analytics.lowStockProducts.slice(0, 5).map((product: any) => (
                    <p key={product.id} className="text-sm text-yellow-800">
                      <span className="font-medium">{product.name}</span> - Only {product.stock} units left
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
