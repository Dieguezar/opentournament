export interface DiscordUser {
  id: string;
  username: string;
  email: string | null;
  verified: boolean;
  avatar: string | null;
}

export class DiscordOAuthError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'DiscordOAuthError';
  }
}

export function buildDiscordAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('scope', 'identify email');
  url.searchParams.set('state', params.state);
  return url.toString();
}

export async function exchangeDiscordCode(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<{ accessToken: string }> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
  });
  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new DiscordOAuthError(
      'The Discord authorization code could not be exchanged.',
      'discord_token_exchange_failed',
    );
  }
  const data = (await res.json()) as { access_token: string };
  return { accessToken: data.access_token };
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new DiscordOAuthError(
      'The Discord user could not be fetched.',
      'discord_user_fetch_failed',
    );
  }
  const data = (await res.json()) as {
    id: string;
    username: string;
    email: string | null;
    verified: boolean;
    avatar: string | null;
  };
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    verified: data.verified,
    avatar: data.avatar,
  };
}
