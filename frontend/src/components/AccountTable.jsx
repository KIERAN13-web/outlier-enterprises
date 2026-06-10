import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import './AccountTable.css';

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
          <h3>
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
                const displayInfo = order.accountInfo || order.phoneNumber || 'N/A';

                return (
                  <tr key={order.id}>
                    <td>
                      <code>{order.id.substring(0, 12)}...</code>
                    </td>
                    <td>{displayInfo}</td>
                    <td>KES {order.amount}</td>
                    <td>
                      <span className={`status-badge status-${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="created-date">{createdDate}</td>
                    <td>
                      {order.status === 'completed' ? (
                        <span className="text-accent">
                          <i className="ti ti-circle-check"></i> Complete
                        </span>
                      ) : order.status === 'verified' ? (
                        <button
                          onClick={() => handleTaskClick(order.id)}
                          className="btn-copy"
                        >
                          Process Task
                        </button>
                      ) : (
                        <span className="status-text">—</span>
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
        <div className="accounts-section">
          <h3>
            <i className="ti ti-database-share"></i> Monitored Telemetry
          </h3>
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
      )}

      {localOrders.length === 0 && accounts.length === 0 && (
        <div className="empty-state-message">
          <p>No orders or accounts yet</p>
        </div>
      )}
    </div>
  );
});

export default AccountTable;
