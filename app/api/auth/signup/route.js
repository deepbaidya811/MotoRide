import db from '../../../../lib/sqlite';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { name, email, password, phone, userType } = await request.json();

    if (!name || !email || !password) {
      return Response.json({ error: 'Please fill all required fields' }, { status: 400 });
    }

    const userTypeValue = userType === 'rider' ? 'rider' : 'passenger';
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ? AND userType = ?').get(email, userTypeValue);
    if (existingUser) {
      return Response.json({ error: 'User already exists with this email' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db.prepare('INSERT INTO users (name, email, password, phone, userType) VALUES (?, ?, ?, ?, ?)')
      .run(name, email, hashedPassword, phone || null, userTypeValue);

    return Response.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: result.lastInsertRowid,
        name,
        email,
        phone,
        userType: userTypeValue
      }
    }, { status: 201 });

  } catch (error) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}