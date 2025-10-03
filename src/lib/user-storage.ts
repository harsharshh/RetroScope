export interface LocalUser {
  id: string;
  email: string;
  name?: string | null;
}

export const LOCAL_USER_STORAGE_KEY = "retroscope:user";
