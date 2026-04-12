import db from '../../../../lib/sqlite';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    } catch {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(decoded.id);

    return Response.json({ success: true, message: 'Account deleted' });

  } catch (error) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}