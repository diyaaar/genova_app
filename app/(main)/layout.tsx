'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { BottomNav } from '@/components/BottomNav';
import { PageTransition } from '@/components/PageTransition';
import { useAuth } from '@/components/AuthProvider';
import { NotificationPrompt } from '@/components/NotificationPrompt';
import { ProfileChangeRequestNotifier } from '@/components/ProfileChangeRequestNotifier';
import { FloatingMiniPlayer } from '@/components/FloatingMiniPlayer';
import { ChoirSelectionGate } from '@/components/ChoirSelectionGate';
import { useTabSwipe } from '@/hooks/useTabSwipe';
import { getRepertoireRoleScope } from '@/lib/repertuvar/cache';
import { getRepertoireCatalogQueryKey, loadRepertoireCatalog } from '@/lib/repertuvar/queries';
import { supabase } from '@/lib/supabase';
import { createRealtimeTopic } from '@/lib/realtime';
import { useEmbeddedWebBridge } from '@/components/EmbeddedWebBridgeProvider';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const {
    authMode,
    isAuthenticated,
    member,
    contextError,
    isLoading,
    isAdmin,
    isSectionLeader,
    refreshChoirContext,
  } = useAuth();
  const embeddedBridge = useEmbeddedWebBridge();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { x: tabSwipeX, handlers: tabSwipeHandlers } = useTabSwipe();

  const mainNavPages = ['/', '/repertuvar', '/chat', '/odevler', '/profil'];
  const showNavigation = mainNavPages.includes(pathname);
  const roleScope = getRepertoireRoleScope(isAdmin(), isSectionLeader());
  const memberId = member?.id ?? null;


  useEffect(() => {
    if (authMode === 'browser' && !isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authMode, isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (authMode === 'embedded' || isLoading || !isAuthenticated || !memberId) {
      return;
    }

    void queryClient.prefetchQuery({
      queryKey: getRepertoireCatalogQueryKey(memberId, roleScope),
      queryFn: () => loadRepertoireCatalog({ memberId, roleScope }),
      staleTime: 30_000,
      gcTime: 24 * 60 * 60_000,
    });
  }, [authMode, isAuthenticated, isLoading, memberId, queryClient, roleScope]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !memberId) {
      return;
    }

    const channel = supabase
      .channel(createRealtimeTopic('global-updates'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['announcements'] });
        void queryClient.invalidateQueries({ queryKey: ['dashboard', 'announcements'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rehearsals' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        void queryClient.invalidateQueries({ queryKey: ['rehearsals'] });
        void queryClient.invalidateQueries({ queryKey: ['korist-performance'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, isLoading, memberId, queryClient]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    void (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith('genova-'))
              .map((cacheName) => caches.delete(cacheName)),
          );
        }
      } catch (error) {
        console.warn('Dev service worker temizleme başarısız:', error);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[var(--color-background)]"
        role="status"
        aria-label="Koro bilgileri yükleniyor"
      >
        <Loader2 className="motion-safe:animate-spin text-[var(--color-accent)]" size={32} aria-hidden="true" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (!member && authMode === 'browser') return <ChoirSelectionGate />;
  if (!member) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-5 py-10">
        <section className="glass-panel w-full max-w-md p-6 text-center" aria-labelledby="embedded-member-error">
          <h1 id="embedded-member-error" className="font-serif text-2xl text-[var(--color-text-high)]">
            Koro bilgileri açılamadı
          </h1>
          <p role="alert" className="mt-3 text-sm leading-6 text-[var(--color-text-medium)]">
            {contextError ?? 'Aktif koro üyeliği doğrulanamadı.'}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => void refreshChoirContext()}
              className="min-h-12 rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-black outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              Yeniden dene
            </button>
            <button
              type="button"
              onClick={embeddedBridge.navigateBack}
              className="min-h-12 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-soft-bg)] px-5 py-3 text-sm font-semibold text-[var(--color-text-high)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              Kapat
            </button>
          </div>
        </section>
      </main>
    );
  }

  const isProfilePage = pathname.startsWith('/profil');
  const isChatPage = pathname.startsWith('/chat');
  const showFadeOverlays = showNavigation && !isProfilePage && !isChatPage;

  return (
    <>
      {!embeddedBridge.isEmbedded && showFadeOverlays && <div className="fade-overlay fade-overlay-top" />}
      {!embeddedBridge.isEmbedded && showNavigation && !isProfilePage && <TopBar />}
      {showNavigation ? (
        <motion.div
          className="tab-swipe-container"
          style={{ x: tabSwipeX }}
          {...tabSwipeHandlers}
        >
          <PageTransition>{children}</PageTransition>
        </motion.div>
      ) : (
        <PageTransition>{children}</PageTransition>
      )}
      {!embeddedBridge.isEmbedded && <FloatingMiniPlayer hasBottomNav={showNavigation} />}
      {!embeddedBridge.isEmbedded && showNavigation && <BottomNav />}
      {!embeddedBridge.isEmbedded && showFadeOverlays && <div className="fade-overlay fade-overlay-bottom" />}
      <ProfileChangeRequestNotifier />
      {!embeddedBridge.isEmbedded && <NotificationPrompt />}
    </>
  );
}
