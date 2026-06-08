import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AccountTable({ accounts, orders = [] }) {
  const [localOrders, setLocalOrders] = useState(orders);
  const navigate = useNavigate();

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  const handleTaskClick = (orderId) => {
    navigate(`/task/${orderId}`);
  };

  return (
    <div className="table-wrapper">
      {/* Orders Table */}
      {localOrders.length > 0 && (
        <div className="orders-section">
          <h3 style={{ marginBottom: '1rem', marginTop: '1.5rem' }}>📋 Orders</h3>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Account / Info</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {localOrders.map((order) => {
                const createdDate = new Date(order.createdAt).toLocaleString();
                const statusColor =
                  order.status === 'verified' ? '#4CAF50' :
                  order.status === 'pending' ? '#FF9800' :
                  '#f44336';

                // Handle both phoneNumber (from STK push) and accountInfo (from place order)
                const displayInfo = order.accountInfo || order.phoneNumber || 'N/A';

                return (
                  <tr key={order.id}>
                    <td>
                      <code style={{ fontSize: '0.85rem' }}>{order.id.substring(0, 12)}...</code>
                    </td>
                    <td>{displayInfo}</td>
                    <td>KES {order.amount}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '4px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          backgroundColor: statusColor,
                          color: 'white',
                          textTransform: 'capitalize',
                        }}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.9rem' }}>{createdDate}</td>
                    <td>
                      {order.status === 'completed' ? (
                        <span
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            display: 'inline-block',
                          }}
                        >
                          ✓ Complete
                        </span>
                      ) : order.status === 'verified' ? (
                        <button
                          onClick={() => handleTaskClick(order.id)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                          }}
                        >
                          Task
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.9rem', color: '#999' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Accounts Table */}
      {accounts.length > 0 && (
        <div className="accounts-section" style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>💼 Accounts</h3>
          <table className="modern-table">
            <thead>
              <tr>
                <th>Account ID</th>
                <th>Account Details</th>
              </tr>
            </thead>
            <tbody>
              {accounts?.map((a) => (
                <tr key={a.id}>
                  <td>
                    <code>{a.id}</code>
                  </td>
                  <td>
                    <pre>{JSON.stringify(a, null, 2)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {localOrders.length === 0 && accounts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
          <p>No orders or accounts yet</p>
        </div>
      )}
    </div>
  );
}

/* Styling is in index.css under .table-wrapper and .modern-table */

