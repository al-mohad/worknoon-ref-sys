import type { CustomerTier } from '../schemas/customer.schema.js';
import type { OrderStatus } from '../schemas/order.schema.js';

/**
 * Everything below is defined as day offsets from "now" and resolved at
 * seed time, so the 15 scenarios in docs/design.md section 4 hold
 * whenever the stack is started - see daysAgo() in run-seed.ts.
 */

export interface SeedCustomer {
  key: string;
  name: string;
  email: string;
  tier: CustomerTier;
  memberSinceDaysAgo: number;
  /** Shown in the support UI's sign-in list to make each scenario easy to try. */
  hint: string;
}

export interface SeedOrderItem {
  sku: string;
  name: string;
  category: string;
  unitPriceCents: number;
  quantity: number;
  finalSale?: boolean;
}

export interface SeedOrder {
  key: string;
  customerKey: string;
  orderNumber: string;
  status: OrderStatus;
  placedDaysAgo: number;
  shippedDaysAgo?: number;
  estimatedDeliveryDaysAgo?: number;
  deliveredDaysAgo?: number;
  carrier?: { name: string; trackingNumber: string; lastEvent: string };
  items: SeedOrderItem[];
  shippingCents?: number;
}

export interface SeedHistoricalRefund {
  customerKey: string;
  orderKey: string;
  sku: string;
  itemName: string;
  quantity: number;
  refundCents: number;
  resolvedDaysAgo: number;
  resolvedByAgent: boolean;
}

export const CUSTOMERS: SeedCustomer[] = [
  { key: 'amara', name: 'Amara Okafor', email: 'amara.okafor@example.com', tier: 'standard', memberSinceDaysAgo: 420, hint: 'Delivered last week, arrived damaged' },
  { key: 'daniel', name: 'Daniel Kim', email: 'daniel.kim@example.com', tier: 'standard', memberSinceDaysAgo: 610, hint: 'Wrong size shipped' },
  { key: 'sofia', name: 'Sofia Martinez', email: 'sofia.martinez@example.com', tier: 'plus', memberSinceDaysAgo: 900, hint: 'Changed her mind about an item' },
  { key: 'omar', name: 'Omar Haddad', email: 'omar.haddad@example.com', tier: 'standard', memberSinceDaysAgo: 200, hint: 'Final sale item, wants a refund anyway' },
  { key: 'grace', name: 'Grace Liu', email: 'grace.liu@example.com', tier: 'standard', memberSinceDaysAgo: 1100, hint: 'Delivered over a month ago' },
  { key: 'priya', name: 'Priya Nair', email: 'priya.nair@example.com', tier: 'plus', memberSinceDaysAgo: 730, hint: 'High-value item, arrived broken' },
  { key: 'marcus', name: 'Marcus Johnson', email: 'marcus.johnson@example.com', tier: 'standard', memberSinceDaysAgo: 150, hint: 'Final sale item, arrived torn' },
  { key: 'chloe', name: 'Chloe Dubois', email: 'chloe.dubois@example.com', tier: 'plus', memberSinceDaysAgo: 500, hint: 'Frequent refunds recently' },
  { key: 'ethan', name: 'Ethan Brooks', email: 'ethan.brooks@example.com', tier: 'standard', memberSinceDaysAgo: 300, hint: 'Says a delivered package never arrived' },
  { key: 'isabella', name: 'Isabella Rossi', email: 'isabella.rossi@example.com', tier: 'standard', memberSinceDaysAgo: 260, hint: 'Package still shows in transit' },
  { key: 'kwame', name: 'Kwame Mensah', email: 'kwame.mensah@example.com', tier: 'standard', memberSinceDaysAgo: 800, hint: 'Two items, one final sale' },
  { key: 'yuki', name: 'Yuki Tanaka', email: 'yuki.tanaka@example.com', tier: 'standard', memberSinceDaysAgo: 950, hint: 'Already refunded this item once' },
  { key: 'leo', name: 'Leo Fischer', email: 'leo.fischer@example.com', tier: 'standard', memberSinceDaysAgo: 90, hint: 'Tries to instruct the system directly' },
  { key: 'hannah', name: 'Hannah Novak', email: 'hannah.novak@example.com', tier: 'plus', memberSinceDaysAgo: 640, hint: 'Sends a fake system notice' },
  { key: 'ava', name: 'Ava Thompson', email: 'ava.thompson@example.com', tier: 'plus', memberSinceDaysAgo: 1200, hint: 'Has three open orders to choose from' },
];

export const ORDERS: SeedOrder[] = [
  {
    key: 'amara-1', customerKey: 'amara', orderNumber: 'ORD-10231', status: 'delivered',
    placedDaysAgo: 12, shippedDaysAgo: 10, estimatedDeliveryDaysAgo: 7, deliveredDaysAgo: 6,
    carrier: { name: 'UPS', trackingNumber: '1Z999AA10123456784', lastEvent: 'Delivered' },
    items: [{ sku: 'KIT-2041', name: 'Ceramic pour-over set', category: 'Kitchen', unitPriceCents: 4_800, quantity: 1 }],
    shippingCents: 0,
  },
  {
    key: 'daniel-1', customerKey: 'daniel', orderNumber: 'ORD-10244', status: 'delivered',
    placedDaysAgo: 15, shippedDaysAgo: 12, estimatedDeliveryDaysAgo: 10, deliveredDaysAgo: 9,
    carrier: { name: 'FedEx', trackingNumber: '789123456012', lastEvent: 'Delivered' },
    items: [{ sku: 'SHO-3381-10', name: 'Trail running shoes (US 10)', category: 'Footwear', unitPriceCents: 12_000, quantity: 1 }],
    shippingCents: 599,
  },
  {
    key: 'sofia-1', customerKey: 'sofia', orderNumber: 'ORD-10252', status: 'delivered',
    placedDaysAgo: 18, shippedDaysAgo: 15, estimatedDeliveryDaysAgo: 13, deliveredDaysAgo: 12,
    carrier: { name: 'USPS', trackingNumber: '9400111899223344556677', lastEvent: 'Delivered' },
    items: [{ sku: 'YOG-1190', name: 'Cork yoga mat', category: 'Fitness', unitPriceCents: 4_000, quantity: 1 }],
  },
  {
    key: 'omar-1', customerKey: 'omar', orderNumber: 'ORD-10260', status: 'delivered',
    placedDaysAgo: 11, shippedDaysAgo: 8, estimatedDeliveryDaysAgo: 6, deliveredDaysAgo: 5,
    carrier: { name: 'UPS', trackingNumber: '1Z999AA10123456790', lastEvent: 'Delivered' },
    items: [{ sku: 'SHI-4471-M', name: 'Linen shirt (M)', category: 'Apparel', unitPriceCents: 3_500, quantity: 1, finalSale: true }],
  },
  {
    key: 'grace-1', customerKey: 'grace', orderNumber: 'ORD-10198', status: 'delivered',
    placedDaysAgo: 52, shippedDaysAgo: 49, estimatedDeliveryDaysAgo: 48, deliveredDaysAgo: 47,
    carrier: { name: 'FedEx', trackingNumber: '789123456099', lastEvent: 'Delivered' },
    items: [{ sku: 'AUD-9021', name: 'Noise-cancelling headphones', category: 'Audio', unitPriceCents: 24_900, quantity: 1 }],
  },
  {
    key: 'priya-1', customerKey: 'priya', orderNumber: 'ORD-10275', status: 'delivered',
    placedDaysAgo: 9, shippedDaysAgo: 6, estimatedDeliveryDaysAgo: 5, deliveredDaysAgo: 4,
    carrier: { name: 'UPS', trackingNumber: '1Z999AA10123456812', lastEvent: 'Delivered' },
    items: [{ sku: 'TV-5502-55', name: '55" 4K TV', category: 'Electronics', unitPriceCents: 74_900, quantity: 1 }],
  },
  {
    key: 'marcus-1', customerKey: 'marcus', orderNumber: 'ORD-10281', status: 'delivered',
    placedDaysAgo: 14, shippedDaysAgo: 11, estimatedDeliveryDaysAgo: 9, deliveredDaysAgo: 8,
    carrier: { name: 'USPS', trackingNumber: '9400111899223344556699', lastEvent: 'Delivered' },
    items: [{ sku: 'BAG-6630', name: 'Leather handbag', category: 'Accessories', unitPriceCents: 42_000, quantity: 1, finalSale: true }],
  },
  {
    key: 'chloe-1', customerKey: 'chloe', orderNumber: 'ORD-10290', status: 'delivered',
    placedDaysAgo: 12, shippedDaysAgo: 9, estimatedDeliveryDaysAgo: 8, deliveredDaysAgo: 7,
    carrier: { name: 'UPS', trackingNumber: '1Z999AA10123456830', lastEvent: 'Delivered' },
    items: [{ sku: 'SPK-7742', name: 'Bluetooth speaker', category: 'Audio', unitPriceCents: 9_900, quantity: 1 }],
  },
  { key: 'chloe-hist-1', customerKey: 'chloe', orderNumber: 'ORD-10402', status: 'delivered', placedDaysAgo: 58, shippedDaysAgo: 56, estimatedDeliveryDaysAgo: 55, deliveredDaysAgo: 55, items: [{ sku: 'LMP-1101', name: 'Desk lamp', category: 'Home', unitPriceCents: 3_000, quantity: 1 }] },
  { key: 'chloe-hist-2', customerKey: 'chloe', orderNumber: 'ORD-10403', status: 'delivered', placedDaysAgo: 47, shippedDaysAgo: 45, estimatedDeliveryDaysAgo: 44, deliveredDaysAgo: 44, items: [{ sku: 'CAS-2202', name: 'Phone case', category: 'Accessories', unitPriceCents: 2_000, quantity: 1 }] },
  { key: 'chloe-hist-3', customerKey: 'chloe', orderNumber: 'ORD-10404', status: 'delivered', placedDaysAgo: 36, shippedDaysAgo: 34, estimatedDeliveryDaysAgo: 33, deliveredDaysAgo: 33, items: [{ sku: 'BOT-3303', name: 'Water bottle', category: 'Outdoor', unitPriceCents: 2_500, quantity: 1 }] },
  {
    key: 'ethan-1', customerKey: 'ethan', orderNumber: 'ORD-10302', status: 'delivered',
    placedDaysAgo: 6, shippedDaysAgo: 4, estimatedDeliveryDaysAgo: 4, deliveredDaysAgo: 3,
    carrier: { name: 'FedEx', trackingNumber: '789123456155', lastEvent: 'Delivered - left at front door' },
    items: [{ sku: 'EAR-8814', name: 'Wireless earbuds', category: 'Audio', unitPriceCents: 17_900, quantity: 1 }],
  },
  {
    key: 'isabella-1', customerKey: 'isabella', orderNumber: 'ORD-10214', status: 'in_transit',
    placedDaysAgo: 20, shippedDaysAgo: 18, estimatedDeliveryDaysAgo: 11,
    carrier: { name: 'USPS', trackingNumber: '9400111899223344556710', lastEvent: 'In transit, arriving late' },
    items: [{ sku: 'THR-9012', name: 'Merino throw', category: 'Home', unitPriceCents: 8_900, quantity: 1 }],
  },
  {
    key: 'kwame-1', customerKey: 'kwame', orderNumber: 'ORD-10311', status: 'delivered',
    placedDaysAgo: 13, shippedDaysAgo: 11, estimatedDeliveryDaysAgo: 10, deliveredDaysAgo: 10,
    carrier: { name: 'UPS', trackingNumber: '1Z999AA10123456855', lastEvent: 'Delivered' },
    items: [
      { sku: 'PAN-1145', name: 'Cast iron skillet', category: 'Kitchen', unitPriceCents: 5_500, quantity: 1 },
      { sku: 'SCF-2287', name: 'Silk scarf', category: 'Accessories', unitPriceCents: 6_500, quantity: 1, finalSale: true },
    ],
  },
  {
    key: 'yuki-1', customerKey: 'yuki', orderNumber: 'ORD-10187', status: 'delivered',
    placedDaysAgo: 30, shippedDaysAgo: 27, estimatedDeliveryDaysAgo: 26, deliveredDaysAgo: 25,
    carrier: { name: 'FedEx', trackingNumber: '789123456201', lastEvent: 'Delivered' },
    items: [{ sku: 'KEY-3341', name: 'Mechanical keyboard', category: 'Electronics', unitPriceCents: 15_900, quantity: 1 }],
  },
  {
    key: 'leo-1', customerKey: 'leo', orderNumber: 'ORD-10320', status: 'delivered',
    placedDaysAgo: 15, shippedDaysAgo: 12, estimatedDeliveryDaysAgo: 11, deliveredDaysAgo: 10,
    carrier: { name: 'UPS', trackingNumber: '1Z999AA10123456877', lastEvent: 'Delivered' },
    items: [{ sku: 'PRK-4462-L', name: 'Winter parka (L)', category: 'Apparel', unitPriceCents: 21_000, quantity: 1, finalSale: true }],
  },
  {
    key: 'hannah-1', customerKey: 'hannah', orderNumber: 'ORD-10333', status: 'delivered',
    placedDaysAgo: 12, shippedDaysAgo: 9, estimatedDeliveryDaysAgo: 7, deliveredDaysAgo: 6,
    carrier: { name: 'FedEx', trackingNumber: '789123456233', lastEvent: 'Delivered' },
    items: [{ sku: 'PUR-5523', name: 'Air purifier', category: 'Home', unitPriceCents: 29_900, quantity: 1 }],
  },
  {
    key: 'ava-1', customerKey: 'ava', orderNumber: 'ORD-10340', status: 'delivered',
    placedDaysAgo: 26, shippedDaysAgo: 23, estimatedDeliveryDaysAgo: 21, deliveredDaysAgo: 20,
    carrier: { name: 'UPS', trackingNumber: '1Z999AA10123456890', lastEvent: 'Delivered' },
    items: [{ sku: 'ESP-6634', name: 'Espresso machine', category: 'Kitchen', unitPriceCents: 62_900, quantity: 1 }],
  },
  {
    key: 'ava-2', customerKey: 'ava', orderNumber: 'ORD-10352', status: 'delivered',
    placedDaysAgo: 9, shippedDaysAgo: 6, estimatedDeliveryDaysAgo: 4, deliveredDaysAgo: 3,
    carrier: { name: 'FedEx', trackingNumber: '789123456277', lastEvent: 'Delivered' },
    items: [{ sku: 'CHR-7745', name: 'Office chair', category: 'Furniture', unitPriceCents: 48_000, quantity: 1 }],
  },
  {
    key: 'ava-3', customerKey: 'ava', orderNumber: 'ORD-10365', status: 'processing',
    placedDaysAgo: 1,
    items: [{ sku: 'DSK-8856', name: 'Standing desk', category: 'Furniture', unitPriceCents: 54_000, quantity: 1 }],
  },
];

export const HISTORICAL_REFUNDS: SeedHistoricalRefund[] = [
  { customerKey: 'chloe', orderKey: 'chloe-hist-1', sku: 'LMP-1101', itemName: 'Desk lamp', quantity: 1, refundCents: 3_000, resolvedDaysAgo: 50, resolvedByAgent: true },
  { customerKey: 'chloe', orderKey: 'chloe-hist-2', sku: 'CAS-2202', itemName: 'Phone case', quantity: 1, refundCents: 2_000, resolvedDaysAgo: 40, resolvedByAgent: true },
  { customerKey: 'chloe', orderKey: 'chloe-hist-3', sku: 'BOT-3303', itemName: 'Water bottle', quantity: 1, refundCents: 2_500, resolvedDaysAgo: 30, resolvedByAgent: true },
  { customerKey: 'yuki', orderKey: 'yuki-1', sku: 'KEY-3341', itemName: 'Mechanical keyboard', quantity: 1, refundCents: 15_900, resolvedDaysAgo: 12, resolvedByAgent: true },
];
