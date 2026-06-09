import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';

const AccountTable = memo(({ accounts, orders = [] }) => {
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
          <h3 style={{ marginBottom: '1.5rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="ti ti-receipt"></i> Active Orders
          </h3>
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
                  order.status === 'verified' ? 'var(--success)' :
                  order.status === 'pending' ? 'var(--warning)' :
                  'var(--danger)';

                // Handle both phoneNumber (from STK push) and accountInfo (from place order)
                const displayInfo = order.accountInfo || order.phoneNumber || 'N/A';

                return (
                  <tr key={order.id}>
                    <td>
                      <code>{order.id.substring(0, 12)}...</code>
                    </td>
                    <td>{displayInfo}</td>
                    <td>KES {order.amount}</td>
                    <td>
                      <span
                        className={`status-badge status-${order.status}`}
                        style={{
                          backgroundColor: statusColor,
                          color: 'var(--primary)',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          border: 'none'
                        }}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.9rem', color: 'var(--secondary)' }}>{createdDate}</td>
                    <td>
                      {order.status === 'completed' ? (
                        <span className="text-accent" style={{ fontWeight: '600' }}>
                          <i className="ti ti-circle-check"></i> Complete
                        </span>
                      ) : order.status === 'verified' ? (
                        <button
                          onClick={() => handleTaskClick(order.id)}
                          className="btn-copy"
                          style={{ padding: '0.4rem 0.8rem' }}
                        >
                          Process Task
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>—</span>
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
        <div className="accounts-section" style={{ marginTop: '3rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="ti ti-database-share"></i> Monitored Telemetry
          </h3>
          <div className="table-wrapper" style={{ margin: 0 }}>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Account ID</th>
                  <th>Payload Structure</th>
                </tr>
              </thead>
              <tbody>
                {accounts?.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <code>{a.id}</code>
                    </td>
                    <td>
                      <pre className="payload-pre">{JSON.stringify(a, null, 2)}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {localOrders.length === 0 && accounts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
          <p>No orders or accounts yet</p>
        </div>
      )}
    </div>
  );
});

export default AccountTable;

/* Styling is in index.css under .table-wrapper and .modern-table */
