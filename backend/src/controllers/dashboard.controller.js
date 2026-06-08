import firebaseAdmin from '../services/firebaseAdmin.js';

async function getAccountPool(req, res) {
  try {
    const rdb = firebaseAdmin.database();

    // Simple pool fetch. In production, you might filter by tags, fairness rules, etc.
    const snap = await rdb.ref('accountPool').limitToFirst(200).get();
    const val = snap.exists() ? snap.val() : {};
    const accounts = Object.entries(val || {}).slice(0, 200).map(([id, data]) => ({ id, ...data }));

    return res.json({ ok: true, accounts });
  } catch (err) {
    console.error('getAccountPool error', err);
    return res.status(500).json({ ok: false, error: 'POOL_FETCH_FAILED' });
  }
}

export default { getAccountPool };

