'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { analyticsAPI } from '@/lib/api';
import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
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
      toast.error('Failed to fetch analytics');
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
      icon: DollarSign,
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
      name: 'Conversion Rate',
      value: analytics?.orders?.total && analytics?.customers?.total
        ? `${((analytics.orders.total / analytics.customers.total) * 100).toFixed(1)}%`
        : '0%',
      icon: TrendingUp,
      color: 'bg-yellow-500',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Monitor your business performance</p>
        </div>

        {/* Key Metrics */}
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

        {/* Orders by Status */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Orders by Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            {analytics?.orders?.byStatus?.map((status: any) => (
              <div key={status.status} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">{status._count}</p>
                <p className="text-sm text-gray-600 mt-1 capitalize">
                  {status.status.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Message Statistics */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Message Activity</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics?.messages?.byType?.map((msg: any) => (
              <div key={msg.sender} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">{msg._count}</p>
                <p className="text-sm text-gray-600 mt-1">{msg.sender}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h2>
          <div className="space-y-3">
            {analytics?.popularProducts?.slice(0, 10).map((item: any, index: number) => (
              <div key={item.product?.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div className="flex items-center">
                  <div className="bg-primary-100 text-primary-600 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.product?.name}</p>
                    <p className="text-sm text-gray-500">{item.orderCount} orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{item.totalQuantity} units</p>
                  <p className="text-sm text-gray-500">
                    ${(item.product?.price * item.totalQuantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
