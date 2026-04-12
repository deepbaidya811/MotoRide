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

    const { userType } = await request.json();

    if (!userType || !['passenger', 'rider'].includes(userType)) {
      return Response.json({ error: 'Invalid user type' }, { status: 400 });
    }

    db.prepare('UPDATE users SET userType = ? WHERE id = ?').run(userType, decoded.id);

    return Response.json({ success: true, userType });

  } catch (error) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}