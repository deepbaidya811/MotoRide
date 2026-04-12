import db from '../../../../lib/sqlite';
import bcrypt from 'bcryptjs';
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

    const { name, email, phone, currentPassword, newPassword } = await request.json();

    const user = db.prepare('SELECT id, name, email, password FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return Response.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);
    }

    if (email && email !== user.email) {
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, user.id);
      if (existingEmail) {
        return Response.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    db.prepare('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?')
      .run(name || user.name, email || user.email, phone || null, user.id);

    const updatedUser = db.prepare('SELECT id, name, email, phone FROM users WHERE id = ?').get(user.id);

    return Response.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone
      }
    });

  } catch (error) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}