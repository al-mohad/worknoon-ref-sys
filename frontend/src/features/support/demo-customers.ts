/**
 * Mirrors backend/src/database/seed/seed-data.ts so the sign-in screen can
 * show a one-line hint per scenario. There's no public "list customers"
 * endpoint - demo sign-in only needs an email, and duplicating this small
 * presentation list keeps the API from exposing every customer's email to
 * anyone who isn't signed in.
 */
export const DEMO_CUSTOMERS = [
  { name: 'Amara Okafor', email: 'amara.okafor@example.com', hint: 'Delivered last week, arrived damaged' },
  { name: 'Daniel Kim', email: 'daniel.kim@example.com', hint: 'Wrong size shipped' },
  { name: 'Sofia Martinez', email: 'sofia.martinez@example.com', hint: 'Changed her mind about an item' },
  { name: 'Omar Haddad', email: 'omar.haddad@example.com', hint: 'Final sale item, wants a refund anyway' },
  { name: 'Grace Liu', email: 'grace.liu@example.com', hint: 'Delivered over a month ago' },
  { name: 'Priya Nair', email: 'priya.nair@example.com', hint: 'High-value item, arrived broken' },
  { name: 'Marcus Johnson', email: 'marcus.johnson@example.com', hint: 'Final sale item, arrived torn' },
  { name: 'Chloe Dubois', email: 'chloe.dubois@example.com', hint: 'Frequent refunds recently' },
  { name: 'Ethan Brooks', email: 'ethan.brooks@example.com', hint: 'Says a delivered package never arrived' },
  { name: 'Isabella Rossi', email: 'isabella.rossi@example.com', hint: 'Package still shows in transit' },
  { name: 'Kwame Mensah', email: 'kwame.mensah@example.com', hint: 'Two items, one final sale' },
  { name: 'Yuki Tanaka', email: 'yuki.tanaka@example.com', hint: 'Already refunded this item once' },
  { name: 'Leo Fischer', email: 'leo.fischer@example.com', hint: 'Tries to instruct the system directly' },
  { name: 'Hannah Novak', email: 'hannah.novak@example.com', hint: 'Sends a fake system notice' },
  { name: 'Ava Thompson', email: 'ava.thompson@example.com', hint: 'Has three open orders to choose from' },
];
