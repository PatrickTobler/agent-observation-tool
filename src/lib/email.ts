import Inbound from "inboundemail";

export interface EmailProvider {
  sendMagicLink(email: string, token: string): Promise<void>;
}

export class InboundNewEmailProvider implements EmailProvider {
  private client: Inbound;

  constructor(apiKey: string) {
    this.client = new Inbound({ apiKey });
  }

  async sendMagicLink(email: string, token: string): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const link = `${baseUrl}/api/v1/auth/magic-link/consume?token=${token}`;

    await this.client.emails.send({
      from: "no-reply@agents.nmkr.io",
      to: email,
      subject: "Your login link — Agent Observation Tool",
      html: `<p>Click the link below to log in:</p><p><a href="${link}">${link}</a></p><p>This link expires in 15 minutes.</p>`,
    });
  }
}

export class MockEmailProvider implements EmailProvider {
  public sentEmails: { email: string; token: string }[] = [];

  async sendMagicLink(email: string, token: string): Promise<void> {
    this.sentEmails.push({ email, token });
  }
}
