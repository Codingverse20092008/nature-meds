import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import type { Order } from '../db/schema.js';

type OrderEmailItem = {
  name: string;
  quantity: number;
  totalPrice: number;
};

let cachedTransporter: nodemailer.Transporter | null = null;

function isEmailConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function getTransporter() {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: env.SMTP_SECURE === 'true',
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  return cachedTransporter;
}

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(`Email transport is not configured. Skipping email to ${to} (${subject}).`);
    return { sent: false };
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  return { sent: true };
}

export async function sendVerificationEmail({
  email,
  firstName,
  token,
}: {
  email: string;
  firstName: string;
  token: string;
}) {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;

  return sendEmail({
    to: email,
    subject: 'Verify your Nature Meds account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #0f172a;">Welcome to Nature Meds</h2>
        <p>Hello ${firstName},</p>
        <p>Your account has been created successfully. Please verify your email address before placing orders.</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}" style="display:inline-block;background:#197dff;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">
            Verify email
          </a>
        </p>
        <p>If the button does not work, use this link:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>Consult a doctor for medical advice.</p>
      </div>
    `,
  });
}

export async function sendOrderConfirmationEmail({
  email,
  firstName,
  order,
  items,
}: {
  email: string;
  firstName: string;
  order: Order;
  items: OrderEmailItem[];
}) {
  const itemsMarkup = items
    .map(
      (item) =>
        `<li style="margin-bottom:8px;">${item.name} x ${item.quantity} - Rs. ${item.totalPrice.toFixed(2)}</li>`
    )
    .join('');

  return sendEmail({
    to: email,
    subject: `Order confirmed: ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #0f172a;">Your Nature Meds order has been placed</h2>
        <p>Hello ${firstName},</p>
        <p>Thank you for your order. Your COD order is now being prepared.</p>
        <p><strong>Order ID:</strong> ${order.orderNumber}</p>
        <p><strong>Payment method:</strong> Cash on Delivery</p>
        <p><strong>Delivery address:</strong> ${order.shippingAddress}, ${order.shippingCity}, ${order.shippingState} ${order.shippingZip}, ${order.shippingCountry}</p>
        <p><strong>Total:</strong> Rs. ${order.total.toFixed(2)}</p>
        <h3>Items</h3>
        <ul style="padding-left:18px;">${itemsMarkup}</ul>
        <p>We do not provide medical advice. Consult a doctor for proper treatment.</p>
      </div>
    `,
  });
}

export function isEmailServiceConfigured() {
  return isEmailConfigured();
}
