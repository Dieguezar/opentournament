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
  avatar: { id: string; url: string } | null;
}

export interface PublicProfileForm {
  isNew?: boolean;
  slug: OwnerPublicProfile['slug'];
  gamertag: OwnerPublicProfile['gamertag'];
  realName: string;
  biography: string;
  isPublished: OwnerPublicProfile['isPublished'];
  showAvatar: OwnerPublicProfile['showAvatar'];
  showRealName: OwnerPublicProfile['showRealName'];
  showBiography: OwnerPublicProfile['showBiography'];
  avatar: OwnerPublicProfile['avatar'];
}

export type OwnerProfileClient = <T>(path: string, init?: RequestInit) => Promise<T>;

export function projectOwnerProfile(profile: OwnerPublicProfile): PublicProfileForm {
  return { ...profile, realName: profile.realName ?? '', biography: profile.biography ?? '' };
}

function buildProfilePayload(form: PublicProfileForm, isPublished = form.isPublished) {
  return {
    ...(form.isNew ? { slug: form.slug } : {}),
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

export async function loadProfileEditor(client: OwnerProfileClient): Promise<PublicProfileForm> {
  try {
    return await loadOwnerProfile(client);
  } catch (error) {
    if (!(error instanceof ApiClientError) || error.status !== 404 || error.code !== 'NOT_FOUND') {
      throw error;
    }
    return {
      isNew: true,
      slug: '',
      gamertag: '',
      realName: '',
      biography: '',
      avatar: null,
      isPublished: false,
      showAvatar: false,
      showRealName: false,
      showBiography: false,
    };
  }
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

export type OwnerProfileDeleteResult =
  { state: 'not-confirmed' | 'deleted' | 'unconfirmed' } | { state: 'failed'; error: unknown };

export async function deleteOwnerProfile(
  client: OwnerProfileClient,
  confirmed: boolean,
): Promise<OwnerProfileDeleteResult> {
  if (!confirmed) return { state: 'not-confirmed' };
  try {
    await client<void>('/profile/public', { method: 'DELETE' });
  } catch (error) {
    return { state: 'failed', error };
  }
  try {
    await client<{ profile: OwnerPublicProfile }>('/profile/public');
    return { state: 'unconfirmed' };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) return { state: 'deleted' };
    return { state: 'failed', error };
  }
}

export async function uploadOwnerAvatar(
  client: OwnerProfileClient,
  file: File,
): Promise<PublicProfileForm> {
  const body = new FormData();
  body.set('file', file);
  await client('/profile/public/avatar', { method: 'POST', body });
  return loadOwnerProfile(client);
}

export async function clearOwnerAvatar(client: OwnerProfileClient): Promise<PublicProfileForm> {
  await client('/profile/public/avatar', { method: 'DELETE' });
  return loadOwnerProfile(client);
}
