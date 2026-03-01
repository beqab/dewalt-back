import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Order, OrderStatus } from '../orders/entities/order.entity';

type Locale = 'ka' | 'en';

type OrderWithId = Order & { _id: string };

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  private formatDateTime(dt: unknown): string {
    const d = dt instanceof Date ? dt : new Date(String(dt));
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}`;
  }

  private formatMoney(value: unknown): string {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return '0';
    return String(n);
  }

  private getDeliveryTypeLabel(locale: Locale, deliveryType: string): string {
    const map: Record<Locale, Record<string, string>> = {
      ka: {
        tbilisi: 'თბილისი',
        region: 'რეგიონი',
      },
      en: {
        tbilisi: 'Tbilisi',
        region: 'Region',
      },
    };
    return map[locale][deliveryType] ?? deliveryType;
  }

  private getStatusLabel(locale: Locale, status: OrderStatus): string {
    const map: Record<Locale, Record<OrderStatus, string>> = {
      ka: {
        pending: 'მოლოდინში',
        shipped: 'თქვნი შეკვთა გამოგზავნილია',
        delivered: 'თქვენი შეკვეთა მიწოდებულია',
        cancelled: 'თქვენი შეკვეთა გაუქმებულია',
        failed: 'წარუმატებელია',
        paid: 'გადახდილია',
      },
      en: {
        pending: 'Pending',
        shipped: 'Your order has been shipped',
        delivered: 'Your order has been delivered',
        cancelled: 'Your order has been cancelled',
        failed: 'Failed',
        paid: 'Paid',
      },
    };
    return map[locale][status] ?? String(status);
  }

  private buildEmailShell(innerHtml: string): string {
    return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f5f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial, sans-serif;box-shadow:0 6px 20px rgba(0,0,0,0.08);">
            <tr>
              <td style="background-color:#f9c300;padding:20px 32px;">
                <h1 style="margin:0;font-size:20px;color:#1f1f1f;letter-spacing:0.5px;">DEWALT</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${innerHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background-color:#fafafa;border-top:1px solid #eee;color:#8a8a8a;font-size:12px;">
                © DEWALT
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `.trim();
  }

  private buildOrderPaidInnerHtml(locale: Locale, order: OrderWithId): string {
    const detailsTitle =
      locale === 'ka' ? 'შეკვეთის დეტალები' : 'Order details';
    const successTitle =
      locale === 'ka' ? 'გადახდა წარმატებულია' : 'Payment successful';
    const successText =
      locale === 'ka'
        ? 'თქვენი შეკვეთა გადახდილია წარმატებით.'
        : 'Your order has been paid successfully.';

    const orderCodeLabel = locale === 'ka' ? 'შეკვეთის კოდი' : 'Order code';
    const orderIdLabel = locale === 'ka' ? 'შეკვეთის ID' : 'Order ID';
    const customerLabel = locale === 'ka' ? 'მყიდველი' : 'Customer';
    const phoneLabel = locale === 'ka' ? 'ტელეფონი' : 'Phone';
    const addressLabel = locale === 'ka' ? 'მისამართი' : 'Address';
    const deliveryLabel = locale === 'ka' ? 'მიწოდება' : 'Delivery';
    const dateLabel = locale === 'ka' ? 'თარიღი' : 'Order date';
    const subtotalLabel = locale === 'ka' ? 'ქვეჯამი' : 'Subtotal';
    const deliveryPriceLabel =
      locale === 'ka' ? 'მიწოდების ფასი' : 'Delivery price';
    const totalLabel = locale === 'ka' ? 'ჯამი' : 'Total';

    const deliveryTypeLabel = this.getDeliveryTypeLabel(
      locale,
      order.deliveryType,
    );

    const infoCard = (label: string, value: string) => `
      <td style="padding:8px;">
        <div style="background:#f6f6f6;border-radius:10px;padding:12px;">
          <div style="font-size:12px;color:#6b6b6b;margin-bottom:6px;">${label}</div>
          <div style="font-size:14px;color:#111;font-weight:600;word-break:break-word;">${value}</div>
        </div>
      </td>
    `;

    const borderedCard = (label: string, value: string) => `
      <td style="padding:8px;">
        <div style="border:1px solid #e8e8e8;border-radius:10px;padding:12px;background:#fff;">
          <div style="font-size:12px;color:#6b6b6b;margin-bottom:6px;">${label}</div>
          <div style="font-size:14px;color:#111;font-weight:600;word-break:break-word;">${value}</div>
        </div>
      </td>
    `;

    return `
      <h2 style="margin:0 0 10px 0;font-size:20px;color:#1f1f1f;">${successTitle}</h2>
      <p style="margin:0 0 18px 0;color:#4b4b4b;font-size:14px;line-height:1.6;">${successText}</p>

      <div style="margin-top:10px;">
        <h3 style="margin:0 0 10px 0;font-size:16px;color:#1f1f1f;">${detailsTitle}</h3>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
          <tr>
            ${infoCard(orderCodeLabel, String(order.uuid ?? ''))}
          </tr>
        </table>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:6px;">
          <tr>
            ${borderedCard(
              customerLabel,
              `${String(order.name ?? '')} ${String(
                order.surname ?? '',
              )}`.trim(),
            )}
            ${borderedCard(phoneLabel, String(order.phone ?? ''))}
          </tr>
          <tr>
            <td style="padding:8px;" colspan="2">
              <div style="border:1px solid #e8e8e8;border-radius:10px;padding:12px;background:#fff;">
                <div style="font-size:12px;color:#6b6b6b;margin-bottom:6px;">${addressLabel}</div>
                <div style="font-size:14px;color:#111;font-weight:600;word-break:break-word;">${String(
                  order.address ?? '',
                )}</div>
              </div>
            </td>
          </tr>
          <tr>
            ${borderedCard(deliveryLabel, deliveryTypeLabel)}
            
          </tr>
        </table>

        <div style="margin-top:12px;border:1px solid #e8e8e8;border-radius:12px;background:#f6f6f6;padding:14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;color:#6b6b6b;font-size:13px;">${subtotalLabel}</td>
              <td style="padding:6px 0;text-align:right;color:#111;font-size:13px;font-weight:600;">GEL ${this.formatMoney(
                order.subtotal,
              )}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#6b6b6b;font-size:13px;">${deliveryPriceLabel}</td>
              <td style="padding:6px 0;text-align:right;color:#111;font-size:13px;font-weight:600;">GEL ${this.formatMoney(
                order.deliveryPrice,
              )}</td>
            </tr>
            <tr>
              <td style="padding:10px 0 0 0;border-top:1px solid #e5e5e5;color:#2d2d2d;font-size:14px;font-weight:700;">${totalLabel}</td>
              <td style="padding:10px 0 0 0;border-top:1px solid #e5e5e5;text-align:right;color:#111;font-size:16px;font-weight:800;">GEL ${this.formatMoney(
                order.total,
              )}</td>
            </tr>
          </table>
        </div>
      </div>
    `.trim();
  }

  private buildOrderStatusChangedInnerHtml(params: {
    locale: Locale;
    order: OrderWithId;
    oldStatus: OrderStatus;
    newStatus: OrderStatus;
  }): string {
    const { locale, order, oldStatus, newStatus } = params;
    const title =
      locale === 'ka' ? 'შეკვეთის სტატუსი განახლდა' : 'Order status updated';
    const textPrefix =
      locale === 'ka'
        ? 'შეკვეთის სტატუსი განახლდა'
        : 'Your order status changed';

    const newLabel = this.getStatusLabel(locale, newStatus);

    const orderCodeLabel = locale === 'ka' ? 'შეკვეთის კოდი' : 'Order code';
    const orderIdLabel = locale === 'ka' ? 'შეკვეთის ID' : 'Order ID';

    return `
      <h2 style="margin:0 0 12px 0;font-size:20px;color:#1f1f1f;">${title}</h2>
      <p style="margin:0 0 18px 0;color:#4b4b4b;font-size:14px;line-height:1.6;">
        ${textPrefix}: <b>${newLabel}</b>.
      </p>
      <div style="border:1px solid #e8e8e8;border-radius:12px;background:#fff;padding:14px;">
        <div style="font-size:12px;color:#6b6b6b;margin-bottom:6px;">${orderCodeLabel}</div>
        <div style="font-size:14px;color:#111;font-weight:700;word-break:break-word;">${String(
          order.uuid ?? '',
        )}</div>
        <div style="height:10px;"></div>
        <div style="font-size:12px;color:#6b6b6b;margin-bottom:6px;">${orderIdLabel}</div>
        <div style="font-size:13px;color:#111;font-weight:600;word-break:break-word;">${String(
          order.uuid ?? '',
        )}</div>
    
        <a href="${process.env.FRONT_URL}${locale}/payment-status?orderId=${order._id}" style="display:inline-block;background-color:#f9c300;color:#1f1f1f;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:6px;font-size:14px;">
            შეკვეთის დეტალები
        </a>
      </div>
    `.trim();
  }

  private async sendWithResend(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const resendKey = this.configService.get<string>('RESEND_EMAIL_KEY');
    if (!resendKey) {
      this.logger.warn('RESEND_EMAIL_KEY is not configured. Email not sent.');
      return;
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'onboarding@resend.dev';

    const testRecipient = this.configService.get<string>('RESEND_TEST_EMAIL');
    const recipientEmail =
      nodeEnv !== 'production' && testRecipient ? testRecipient : params.to;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipientEmail],
          subject: params.subject,
          html: params.html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Failed to send email via Resend: ${errorText}`,
          undefined,
        );
      }
    } catch (err) {
      this.logger.error('Failed to send email via Resend', err);
    }
  }

  async sendOrderPaidEmail(params: {
    to: string;
    locale: Locale;
    order: OrderWithId;
  }): Promise<void> {
    const subject =
      params.locale === 'ka' ? 'გადახდა წარმატებულია' : 'Payment successful';

    const html = this.buildEmailShell(
      this.buildOrderPaidInnerHtml(params.locale, params.order),
    );
    await this.sendWithResend({ to: params.to, subject, html });
  }

  async sendOrderStatusChangedEmail(params: {
    to: string;
    locale: Locale;
    order: Order;
    oldStatus: OrderStatus;
    newStatus: OrderStatus;
  }): Promise<void> {
    const subject =
      params.locale === 'ka'
        ? 'შეკვეთის სტატუსი განახლდა'
        : 'Order status updated';

    const html = this.buildEmailShell(
      this.buildOrderStatusChangedInnerHtml({
        locale: params.locale,
        order: params.order as OrderWithId,
        oldStatus: params.oldStatus,
        newStatus: params.newStatus,
      }),
    );
    await this.sendWithResend({ to: params.to, subject, html });
  }
}
