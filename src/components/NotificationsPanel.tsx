import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatRelativeTime, getNotificationHref } from '@/lib/app-utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Notification } from '@/types/app';

export function NotificationsPanel() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error: queryError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (queryError) {
        throw queryError;
      }

      return (data ?? []) as Notification[];
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (open && user?.id) {
      void refetch();
    }
  }, [open, refetch, user?.id]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user!.id);

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onError: (mutationError: Error) => {
      toast({
        title: 'Не удалось обновить уведомление',
        description: mutationError.message,
        variant: 'destructive',
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      toast({ title: 'Все уведомления отмечены прочитанными' });
    },
    onError: (mutationError: Error) => {
      toast({
        title: 'Не удалось обновить уведомления',
        description: mutationError.message,
        variant: 'destructive',
      });
    },
  });

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markReadMutation.mutateAsync(notification.id);
    }

    setOpen(false);
    navigate(
      getNotificationHref(
        profile?.role,
        notification.related_entity_type ?? notification.type,
        notification.related_entity_id,
      ),
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative rounded-md p-2 transition-colors hover:bg-accent">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Уведомления</p>
            <p className="text-xs text-muted-foreground">{notifications.length} записей</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            disabled={!unreadCount || markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Прочитать все
          </Button>
        </div>

        <ScrollArea className="h-[360px]">
          <div className="p-2">
            {isLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Загрузка…</p>
            ) : error ? (
              <p className="py-10 text-center text-sm text-destructive">Не удалось загрузить уведомления.</p>
            ) : notifications.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Новых уведомлений нет</p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition-colors hover:bg-muted/40 ${
                    notification.is_read ? 'border-transparent' : 'border-primary/20 bg-primary/5'
                  }`}
                  onClick={() => void handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                        <p className="text-sm font-medium text-foreground">{notification.title}</p>
                      </div>
                      {notification.body && (
                        <p className="text-xs leading-relaxed text-muted-foreground">{notification.body}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
