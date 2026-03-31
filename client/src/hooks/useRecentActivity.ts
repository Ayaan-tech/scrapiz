import { useState, useEffect, useMemo } from 'react';
import { 
  AuthService, 
  ProductSummary, 
  CategorySummary,
  OrderSummary 
} from '../api/apiService';
 
export interface RecentActivity {
  id: number;
  type: 'pickup_completed' | 'pickup_scheduled';
  amount: string;
  date: string;
  description: string;
}

export const useRecentActivity = (orders: OrderSummary[], products: ProductSummary[], limit = 2) =>{
    const recentActivity = useMemo(() => {
      const safeOrders = orders || [];
    return safeOrders.slice(0, limit).map(order => {
      const statusName = (typeof order.status === 'string' ? order.status : order.status?.name || '').toLowerCase();
      const items = Array.isArray(order?.orders) ? order.orders : [];
      const totalAmount = items.reduce((sum, item) => {
        const product = products.find(p => p.id === item.product.id);
        const rate = product ? (product.max_rate + product.min_rate) / 2 : 0;
        const quantity = parseFloat(item.quantity) || 0;
        return sum + (rate * quantity);
      }, 0);

      return {
        id: order.id,
        type: statusName === 'completed' || statusName === 'delivered' ? 'pickup_completed' as const : 'pickup_scheduled' as const,
        amount: `₹${Math.round(totalAmount)}`,
        date: new Date(order.created_at).toLocaleDateString(),
        description: `Order #${order.order_number}`,
      };
    });
  }, [orders, products, limit]);

  return recentActivity;
}