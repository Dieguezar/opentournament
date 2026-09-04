import { ApiClientError } from './api';

export interface OwnerPublicProfile {
  slug: string;
  gamertag: string;
  realName: string | null;
  biography: string | null;
  isPublished: boolean;
  showAvatar: boolean;
  showRealName: boolean;
  showBiography: boolean;
}

export interface PublicProfileForm {
  slug: OwnerPublicProfile['slug'];
  gamertag: OwnerPublicProfile['gamertag'];
  realName: string;
  biography: string;
  isPublished: OwnerPublicProfile['isPublished'];
  showAvatar: OwnerPublicProfile['showAvatar'];
  showRealName: OwnerPublicProfile['showRealName'];
  showBiography: OwnerPublicProfile['showBiography'];
}

export type OwnerProfileClient = <T>(path: string, init?: RequestInit) => Promise<T>;

export function projectOwnerProfile(profile: OwnerPublicProfile): PublicProfileForm {
  return { ...profile, realName: profile.realName ?? '', biography: profile.biography ?? '' };
}

function buildProfilePayload(form: PublicProfileForm, isPublished = form.isPublished) {
  return {
    gamertag: form.gamertag,
    realName: form.realName || null,
    biography: form.biography || null,
    isPublished,
    showAvatar: form.showAvatar,
    showRealName: form.showRealName,
    showBiography: form.showBiography,
  };
}

export async function loadOwnerProfile(client: OwnerProfileClient): Promise<PublicProfileForm> {
  const response = await client<{ profile: OwnerPublicProfile }>('/profile/public');
  return projectOwnerProfile(response.profile);
}

export async function saveOwnerProfile(
  client: OwnerProfileClient,
  form: PublicProfileForm,
  hide = false,
): Promise<PublicProfileForm> {
  await client('/profile/public', {
    method: 'PUT',
    body: JSON.stringify(buildProfilePayload(form, hide ? false : form.isPublished)),
  });
  return loadOwnerProfile(client);
}

export async function deleteOwnerProfile(
  client: OwnerProfileClient,
  confirmed: boolean,
): Promise<'not-confirmed' | 'deleted' | 'unconfirmed'> {
  if (!confirmed) return 'not-confirmed';
  await client<void>('/profile/public', { method: 'DELETE' });
  try {
    await client<{ profile: OwnerPublicProfile }>('/profile/public');
    return 'unconfirmed';
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) return 'deleted';
    throw error;
  }
}
