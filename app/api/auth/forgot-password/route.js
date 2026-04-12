import db from '../../../../lib/sqlite';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) {
      return Response.json({ success: true, message: 'If this email exists, password reset is allowed' });
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_expiry = NULL WHERE id = ?')
        .run(hashedPassword, user.id);

      return Response.json({
        success: true,
        message: 'Password has been reset successfully'
      });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetExpiry = Date.now() + 10 * 60 * 1000;

    db.prepare('UPDATE users SET reset_token = ?, reset_expiry = ? WHERE id = ?')
      .run(resetToken, resetExpiry, user.id);

    return Response.json({
      success: true,
      message: 'Email verified, you may now reset your password'
    });

  } catch (error) {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}