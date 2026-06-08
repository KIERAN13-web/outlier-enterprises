import { useState } from 'react';
import { auth } from '../firebase/client';
import { useNavigate, Link } from 'react-router-dom';
import paymentApi from '../api/paymentApi';
import './OutlierBook.css';

const names = [
  'Ava Parker',
  'Noah Brooks',
  'Liam Carter',
  'Emma Hayes',
  'Mia Foster',
  'Lucas Morgan',
  'Zoe Bennett',
  'Ethan Reed',
  'Harper Diaz',
  'Jackson Hayes',
  'Olivia Cole',
  'Mason Price',
  'Isla Green',
  'Aiden Rivera',
  'Sophia Knight',
  'Caleb Walker',
  'Chloe Adams',
  'Wyatt Moore',
  'Ella Ross',
  'Henry Grant',
];

function randomAmount() {
  return Math.floor(Math.random() * 1001) + 1500; // 1500 - 2500
}

function getAvatar(index) {
  const id = (index % 70) + 1;
  return `https://i.pravatar.cc/150?img=${id}`;
}

function generateAccounts() {
  return Array.from({ length: 100 }, (_, index) => {
    const name = names[index % names.length];
    return {
      id: `acct-${index + 1}`,
      name,
      location: 'Available account',
      profile: getAvatar(index),
      amount: randomAmount(),
      description: 'Account ready for funding',
    };
  });
}

export default function OutlierBook() {
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(null);
  const navigate = useNavigate();

  async function loadAccounts() {
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Please log in to continue.');

      const accounts = generateAccounts();
      setAccounts(accounts);
      setMessage('100 accounts loaded. Choose one to place an order.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load accounts');
    } finally {
      setBusy(false);
    }
  }

  async function placeOrder(account) {
    setPlacing(account.id);
    setError('');
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Please log in to continue.');

      const token = await user.getIdToken();
      const order = await paymentApi.placeOrder(token, {
        accountId: account.id,
        accountName: account.name,
        amount: account.amount,
      });

      setSelected(account.id);
      setMessage(`✓ Order placed for ${account.name} at KES ${account.amount}.`);
      
      // Auto-redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to place order');
    } finally {
      setPlacing(null);
    }
  }

  return (
    <div className="outlier-container">
      <div className="outlier-header">
        <div>
          <h1>Create Outlier Book</h1>
          <p>Choose an account and place an order for testing.</p>
        </div>
        <Link to="/dashboard" className="btn btn-secondary">
          ← Back to Dashboard
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <div className="outlier-controls card">
        <div className="control-header">
          <h3>Available Accounts</h3>
          <p>Load the account pool and place orders with one click.</p>
        </div>
        <button
          disabled={busy}
          onClick={loadAccounts}
          className="btn btn-primary btn-lg"
        >
          {busy ? 'Loading accounts...' : 'Create Outlier Book Now'}
        </button>
      </div>

      {accounts.length > 0 && (
        <div className="account-grid">
          {accounts.map((account) => (
            <div key={account.id} className="account-card card">
              <img src={account.profile} alt={account.name} className="account-avatar" />
              <div className="account-info">
                <h3>{account.name}</h3>
                <p>{account.location}</p>
                <p>{account.description}</p>
              </div>
              <div className="account-footer">
                <div className="account-price">KES {account.amount}</div>
                <button
                  type="button"
                  className={`btn btn-secondary btn-sm ${selected === account.id ? 'selected' : ''}`}
                  onClick={() => placeOrder(account)}
                  disabled={placing === account.id}
                >
                  {placing === account.id ? 'Placing...' : selected === account.id ? 'Ordered' : 'Place Order'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

