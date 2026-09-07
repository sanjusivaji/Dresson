<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Sales Report</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { text-align: center; color: #6b66f5; }
        .summary { margin-bottom: 30px; padding: 15px; background: #f9fafb; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #f3f4f6; color: #374151; }
    </style>
</head>
<body>
    <h1>Dresson Sales Report</h1>
    
    <div class="summary">
        <p><strong>Total Revenue:</strong> ₹<%= stats.totalSales.toLocaleString('en-IN') %></p>
        <p><strong>Total Orders:</strong> <%= stats.totalOrders %></p>
        <p><strong>Total Discounts:</strong> ₹<%= (stats.totalDiscounts || 0).toLocaleString('en-IN') %></p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            <% orders.forEach(order => { %>
                <tr>
                    <td><%= order.orderId %></td>
                    <td><%= new Date(order.createdAt).toLocaleDateString('en-IN') %></td>
                    <td><%= order.shippingAddress?.fullName || order.user?.firstName || 'N/A' %></td>
                    <td><%= order.paymentMethod %></td>
                    <td><%= order.deliveryStatus %></td>
                    <td>₹<%= order.totalAmount.toLocaleString('en-IN') %></td>
                </tr>
            <% }) %>
        </tbody>
    </table>
</body>
</html>