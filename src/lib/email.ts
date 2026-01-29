export interface EmailProvider {
  sendMagicLink(email: string, token: string): Promise<void>;
}

export class InboundNewEmailProvider implements EmailProvider {
  constructor(private apiKey: string) {}

  async sendMagicLink(email: string, token: string): Promise<void> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const link = `${baseUrl}/api/v1/auth/magic-link/consume?token=${token}`;

    const res = await fetch("https://inbound.new/api/v2/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: "Agent Observation <agent@inbnd.dev>",
        to: email,
        subject: "Your login link — Agent Observation Tool",
        html: `<p>Click the link below to log in:</p><p><a href="${link}">${link}</a></p><p>This link expires in 15 minutes.</p>`,
      }),
    });

    if (!res.ok) {
      throw new Error(`Email send failed: ${res.status}`);
    }
  }
}

export class MockEmailProvider implements EmailProvider {
  public sentEmails: { email: string; token: string }[] = [];

  async sendMagicLink(email: string, token: string): Promise<void> {
    this.sentEmails.push({ email, token });
  }
}
