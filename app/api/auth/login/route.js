import db from '../../../../lib/sqlite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: 'Please provide email and password' }, { status: 400 });
    }

    const user = db.prepare('SELECT id, name, email, phone, password FROM users WHERE email = ?').get(email);
    if (!user) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });

    db.prepare('UPDATE users SET isActive = 1 WHERE id = ?').run(user.id);

    return Response.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        userType: user.userType || "passenger"
      }
    });

  } catch (error) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}