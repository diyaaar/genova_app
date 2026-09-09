'use client';

import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, type ChoirMember, type UserRole } from '@/lib/supabase';
import { clearAssignmentCaches } from '@/lib/assignment-cache';
import { clearChatCaches } from '@/lib/chat-cache';
import {
  activateChoir,
  clearPreferredChoirId,
  findCurrentChoir,
  findPreferredMembership,
  getPreferredChoirId,
  loadMyChoirs,
  setPreferredChoirId,
  type ChoirMembershipOption,
} from '@/lib/choir-context';
import { clearProtectedDriveFileUrlCache } from '@/lib/drive-file-url';
import { clearRepertoireMetadataCaches } from '@/lib/repertuvar/cache';
import { clearProtectedDriveFileCaches } from '@/lib/repertuvar/offline';
import { createRealtimeTopic } from '@/lib/realtime';
import { clearMainNotificationCaches } from '@/lib/notification-cache';
import { annotationSaveQueue } from '@/lib/repertuvar/annotation-save-runtime';
import { commitAnnotationTenantTransition } from '@/lib/repertuvar/annotation-tenant-transition';
import { useToast } from '@/components/ToastProvider';

type MemberWithRelations = ChoirMember & {
  schools?: { name: string } | null;
  departments?: { name: string } | null;
  repertoire?: { title: string; composer: string | null } | null;
};

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  member: ChoirMember | null;
  roles: UserRole[];
  choirs: ChoirMembershipOption[];
  activeChoir: ChoirMembershipOption | null;
  contextError: string | null;
  isLoading: boolean;
  isSwitchingChoir: boolean;
  selectChoir: (choirId: string) => Promise<void>;
  refreshChoirContext: () => Promise<void>;
  isAdmin: () => boolean;
  isSectionLeader: () => boolean;
  isChorist: () => boolean;
  getVoiceGroup: () => string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeRoleName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ş/gi, 's')
    .replace(/ı/gi, 'i')
    .toLocaleLowerCase('tr-TR')
    .trim();
}

function toCanonicalRole(value: string): UserRole | null {
  const normalized = normalizeRoleName(value);
  if (normalized === 'sef') return 'Şef';
  if (normalized === 'partisyon sefi') return 'Partisyon Şefi';
  if (normalized === 'korist') return 'Korist';
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const requestVersionRef = useRef(0);
  const activeUserIdRef = useRef<string | null>(null);
  const switchInFlightRef = useRef(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<ChoirMember | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [choirs, setChoirs] = useState<ChoirMembershipOption[]>([]);
  const [activeChoir, setActiveChoir] = useState<ChoirMembershipOption | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingChoir, setIsSwitchingChoir] = useState(false);

  const clearTenantData = useCallback(async () => {
    clearAssignmentCaches();
    clearChatCaches();
    clearRepertoireMetadataCaches();
    clearProtectedDriveFileUrlCache();
    clearMainNotificationCaches();
    queryClient.clear();
    await clearProtectedDriveFileCaches().catch(() => {
      // Cache API cleanup is best effort; authorization remains server-side.
    });
  }, [queryClient]);

  const fetchMemberData = useCallback(async (
    userId: string,
    options: { showLoader?: boolean; usePreference?: boolean } = {},
  ) => {
    const requestVersion = ++requestVersionRef.current;
    if (options.showLoader) setIsLoading(true);
    setContextError(null);

    try {
      let membershipOptions = await loadMyChoirs(supabase);
      let currentChoir = findCurrentChoir(membershipOptions);

      if (!currentChoir) {
        const preferredChoir = options.usePreference === false
          ? null
          : findPreferredMembership(membershipOptions, getPreferredChoirId(userId));
        const recoverableChoir = preferredChoir ?? (membershipOptions.length === 1 ? membershipOptions[0] : null);

        if (recoverableChoir) {
          await activateChoir(supabase, recoverableChoir.choir_id);
          membershipOptions = membershipOptions.map((option) => ({
            ...option,
            is_current: option.choir_id === recoverableChoir.choir_id,
          }));
          currentChoir = { ...recoverableChoir, is_current: true };
        }
      }

      if (requestVersionRef.current !== requestVersion) return;
      setChoirs(membershipOptions);
      setActiveChoir(currentChoir);

      if (!currentChoir) {
        annotationSaveQueue.discardAll();
        setMember(null);
        setRoles([]);
        return;
      }

      setPreferredChoirId(userId, currentChoir.choir_id);
      const memberResult = await supabase
        .from('choir_members')
        .select(`
          id, choir_id, first_name, last_name, voice_group, sub_voice_group, auth_user_id,
          email, phone, is_active, photo_url, birth_date, join_date,
          school_id, department_id, favorite_song_id, about_text,
          linkedin_url, instagram_url, youtube_url, spotify_url, tiktok_url, x_url,
          schools(name),
          departments(name),
          repertoire:favorite_song_id(title, composer)
        `)
        .eq('id', currentChoir.member_id)
        .eq('choir_id', currentChoir.choir_id)
        .eq('auth_user_id', userId)
        .maybeSingle() as unknown as {
          data: MemberWithRelations | null;
          error: { message: string } | null;
        };

      if (memberResult.error) throw new Error(memberResult.error.message);
      if (!memberResult.data) throw new Error('Aktif koro üyeliği yüklenemedi.');

      const memberData = memberResult.data;
      memberData.school_name = memberData.schools?.name ?? null;
      memberData.department_name = memberData.departments?.name ?? null;
      memberData.favorite_song_title = memberData.repertoire?.title ?? null;
      memberData.favorite_song_composer = memberData.repertoire?.composer ?? null;

      const { data: rolesData, error: rolesError } = await supabase
        .from('choir_member_roles')
        .select('roles(name)')
        .eq('member_id', memberData.id)
        .eq('choir_id', currentChoir.choir_id);
      if (rolesError) throw new Error(rolesError.message);

      const canonicalRoles = new Set<UserRole>();
      for (const row of rolesData || []) {
        const roleValue = (row as { roles?: { name?: string } | { name?: string }[] | null }).roles;
        const roleNames = Array.isArray(roleValue)
          ? roleValue.map((entry) => entry?.name).filter((name): name is string => Boolean(name))
          : roleValue?.name
            ? [roleValue.name]
            : [];

        for (const roleName of roleNames) {
          const canonical = toCanonicalRole(roleName);
          if (canonical) canonicalRoles.add(canonical);
        }
      }

      if (requestVersionRef.current !== requestVersion) return;
      setMember(memberData);
      setRoles(Array.from(canonicalRoles));
    } catch (error) {
      if (requestVersionRef.current !== requestVersion) return;
      setChoirs([]);
      setActiveChoir(null);
      setMember(null);
      setRoles([]);
      setContextError(error instanceof Error ? error.message : 'Koro bilgileri yüklenemedi.');
    } finally {
      if (requestVersionRef.current === requestVersion) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      const nextUser = nextSession?.user ?? null;
      const previousUserId = activeUserIdRef.current;
      activeUserIdRef.current = nextUser?.id ?? null;
      setSession(nextSession);
      setUser(nextUser);

      if (nextUser) {
        if (previousUserId && previousUserId !== nextUser.id) {
          clearPreferredChoirId(previousUserId);
          annotationSaveQueue.discardAll();
          void clearTenantData();
          setMember(null);
          setRoles([]);
        }
        void fetchMemberData(nextUser.id, { showLoader: true });
        return;
      }

      requestVersionRef.current += 1;
      if (previousUserId) clearPreferredChoirId(previousUserId);
      annotationSaveQueue.discardAll();
      void clearTenantData();
      setChoirs([]);
      setActiveChoir(null);
      setMember(null);
      setRoles([]);
      setContextError(null);
      setIsLoading(false);
    };

    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    return () => {
      active = false;
      requestVersionRef.current += 1;
      subscription.unsubscribe();
    };
  }, [clearTenantData, fetchMemberData]);

  useEffect(() => {
    if (!user?.id) return;

    let channel = supabase
      .channel(createRealtimeTopic(`auth-member:${user.id}`))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'choir_members',
          filter: `auth_user_id=eq.${user.id}`,
        },
        () => {
          void fetchMemberData(user.id);
        },
      );

    if (member?.id) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'choir_member_roles',
          filter: `member_id=eq.${member.id}`,
        },
        () => {
          void fetchMemberData(user.id);
        },
      );
    }

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, member?.id, fetchMemberData]);

  const selectChoir = useCallback(async (choirId: string) => {
    if (!user || activeChoir?.choir_id === choirId || switchInFlightRef.current) return;
    if (!choirs.some((option) => option.choir_id === choirId)) {
      setContextError('Bu hesap için seçilen koro üyeliği bulunamadı.');
      return;
    }

    switchInFlightRef.current = true;
    setIsSwitchingChoir(true);
    setContextError(null);
    try {
      await commitAnnotationTenantTransition(
        annotationSaveQueue,
        member?.id ?? null,
        () => activateChoir(supabase, choirId),
      );
      if (activeUserIdRef.current !== user.id) return;
      setPreferredChoirId(user.id, choirId);
      setMember(null);
      setRoles([]);
      setIsLoading(true);
      await clearTenantData();
      await fetchMemberData(user.id, { showLoader: true, usePreference: false });
    } catch (error) {
      setContextError(error instanceof Error ? error.message : 'Koro değiştirilemedi.');
      setIsLoading(false);
    } finally {
      switchInFlightRef.current = false;
      setIsSwitchingChoir(false);
    }
  }, [activeChoir?.choir_id, choirs, clearTenantData, fetchMemberData, member?.id, user]);

  const refreshChoirContext = useCallback(async () => {
    if (!user) return;
    await fetchMemberData(user.id, { showLoader: true });
  }, [fetchMemberData, user]);

  const isAdmin = () => roles.includes('Şef');
  const isSectionLeader = () => roles.includes('Partisyon Şefi') || roles.includes('Şef');
  const isChorist = () => !roles.includes('Şef') && !roles.includes('Partisyon Şefi');
  const getVoiceGroup = () => member?.voice_group ?? null;

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    try {
      await commitAnnotationTenantTransition(
        annotationSaveQueue,
        member?.id ?? null,
        async () => {
          const { error } = await supabase.auth.signOut();
          if (error) throw new Error(error.message);
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Notlar kaydedilemedi.';
      setContextError(message);
      toast.error(message, 'Çıkış yapılamadı');
      return;
    }

    requestVersionRef.current += 1;
    if (user?.id) clearPreferredChoirId(user.id);
    await clearTenantData();
    setChoirs([]);
    setActiveChoir(null);
    setMember(null);
    setRoles([]);
  };

  const tenantKey = `${user?.id ?? 'anonymous'}:${activeChoir?.choir_id ?? 'no-choir'}`;

  return (
    <AuthContext.Provider value={{
      session,
      user,
      member,
      roles,
      choirs,
      activeChoir,
      contextError,
      isLoading,
      isSwitchingChoir,
      selectChoir,
      refreshChoirContext,
      isAdmin,
      isSectionLeader,
      isChorist,
      getVoiceGroup,
      signIn,
      signOut,
    }}>
      <Fragment key={tenantKey}>{children}</Fragment>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
