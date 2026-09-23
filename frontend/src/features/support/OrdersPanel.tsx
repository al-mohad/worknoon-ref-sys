import { useQuery } from '@tanstack/react-query';
import { Card, CardBody, CardHeader } from '../../components/Card.tsx';
import { api } from '../../lib/api.ts';
import { formatDateTime } from '../../lib/format.ts';
import type { Order } from '../../lib/types.ts';

export function OrdersPanel({ onAsk }: { onAsk: (text: string) => void }) {
  const { data: orders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.get<Order[]>('/me/orders'),
  });

  return (
    <Card>
      <CardHeader>Your orders</CardHeader>
      <CardBody className="space-y-4">
        {orders?.length === 0 && <p className="text-sm text-slate-500">No orders on file.</p>}
        {orders?.map((order) => (
          <div key={order.orderNumber} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900">{order.orderNumber}</span>
              <span className="capitalize text-slate-500">{order.status.replaceAll('_', ' ')}</span>
            </div>
            <p className="text-xs text-slate-500">
              {order.deliveredAt
                ? `Delivered ${formatDateTime(order.deliveredAt)}`
                : order.estimatedDeliveryAt
                  ? `Estimated ${formatDateTime(order.estimatedDeliveryAt)}`
                  : 'Not yet shipped'}
            </p>
            <ul className="mt-2 space-y-1.5">
              {order.items.map((item) => (
                <li key={item.sku} className="flex items-center justify-between text-sm">
                  <button
                    onClick={() => onAsk(`About my ${item.name} from ${order.orderNumber}: `)}
                    className="text-left text-slate-700 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
                  >
                    {item.name}
                  </button>
                  {item.finalSale && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      Final sale
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
