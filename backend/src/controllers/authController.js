const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { z } = require('zod');
const prisma = require('../config/db');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2),
  dob: z.string(), // ISO date string, e.g. "2000-05-14"
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
});

function calculateAge(dob) {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const { email, password, name, dob, gender } = parsed.data;

  if (calculateAge(dob) < 18) {
    return res.status(400).json({ error: 'You must be 18 or older to use this app' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash, name, dob: new Date(dob), gender },
  });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { verificationCode: code, verificationCodeExpiresAt: expiresAt },
  });

  let emailSent = true;
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: 'Verify your Waplike account',
      html: `<h3>Your verification code is: <b>${code}</b></h3><p>It expires in 15 minutes.</p>`,
    });
  } catch (mailError) {
    console.error('Failed to send verification email', mailError);
    emailSent = false;
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  return res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name, isEmailVerified: false },
    emailSent,
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isEmailVerified: user.isEmailVerified,
    },
  });
}

async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      name: true,
      dob: true,
      gender: true,
      bio: true,
      location: true,
      photos: true,
      createdAt: true,
      isEmailVerified: true,
      isPremium: true,
      premiumUntil: true,
      boostedUntil: true,
      isVerified: true,
      verificationStatus: true,
      superLikesUsed: true,
      isIncognito: true,
      theme: true,
      occupation: true,
      education: true,
      zodiacSign: true,
      loveLanguage: true,
      latitude: true,
      longitude: true,
      interests: { include: { interest: { select: { name: true } } } },
    },
  });
  return res.json({ user });
}

async function verifyEmail(req, res) {
  const userId = req.userId;
  const { code } = req.body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.isEmailVerified) return res.json({ verified: true });

  if (!user.verificationCode || !user.verificationCodeExpiresAt) {
    return res.status(400).json({ error: 'No verification code was generated' });
  }

  if (user.verificationCode !== String(code).trim() || user.verificationCodeExpiresAt < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isEmailVerified: true,
      verificationCode: null,
      verificationCodeExpiresAt: null,
    },
  });

  return res.json({ verified: true, user: { ...user, isEmailVerified: true } });
}

module.exports = { register, login, me, verifyEmail };
