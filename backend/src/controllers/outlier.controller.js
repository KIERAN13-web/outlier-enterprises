import firebaseAdmin from '../services/firebaseAdmin.js';
import outlierEngine from '../services/outlierEngine.js';

async function createOutlierBook(req, res) {
  try {
    const { uid } = req.user;
    const { accountIds } = req.body;

    const rdb = firebaseAdmin.database();

    // Fetch accounts by id if provided, else analyze a default slice.
    let accounts = [];

    if (Array.isArray(accountIds) && accountIds.length > 0) {
      // In real code, use batched reads with chunking.
      const snaps = await Promise.all(
        accountIds.map((id) => rdb.ref(`accountPool/${id}`).get())
      );
      accounts = snaps.filter((s) => s.exists()).map((s) => ({ id: s.key, ...s.val() }));
    } else {
      const snap = await rdb.ref('accountPool').limitToFirst(200).get();
      const val = snap.exists() ? snap.val() : {};
      accounts = Object.entries(val || {}).slice(0, 200).map(([id, data]) => ({ id, ...data }));
    }

    const outliers = outlierEngine.detectOutliers(accounts);

    const bookRef = rdb.ref('outlierBooks').push();
    const bookId = bookRef.key;

    await bookRef.set({
      bookId,
      ownerUid: uid,
      createdAt: new Date().toISOString(),
      accountCount: accounts.length,
      outlierCount: outliers.length,
      outliers,
      params: {
        method: 'placeholder',
      },
    });

    return res.json({ ok: true, bookId, outliers });
  } catch (err) {
    console.error('createOutlierBook error', err);
    return res.status(500).json({ ok: false, error: 'BOOK_CREATE_FAILED' });
  }
}

export default { createOutlierBook };

