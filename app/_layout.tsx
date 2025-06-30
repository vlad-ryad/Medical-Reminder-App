// Импорт необходимых модулей
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, View } from 'react-native';
import type { NotificationResponse } from 'expo-notifications';
import { getLocalStorage } from '../service/Storage';
import { StatusBar } from 'expo-status-bar';

/**
 * RootLayout — это корневой компонент приложения.
 * Он отвечает за:
 * - настройку обработки уведомлений,
 * - обработку кликов по уведомлениям (переход к экрану действия),
 * - защиту маршрутов в зависимости от пользователя,
 * - базовую навигацию.
 */

// Тип для данных уведомления
type NotificationData = {
  type: string;
  medId: string;
  date: string;
  reminderTime?: string;
  medName?: string;
  medDose?: string;
  medWhen?: string;
  userEmail?: string;
};

export default function RootLayout() {
  const router = useRouter();
  const notificationResponse = useRef<NotificationResponse>();

  /**
     * Настройка обработки уведомлений и обработка кликов по ним
     */
  useEffect(() => {
    // Устанавливаем базовый обработчик уведомлений
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Подписываемся на события клика по уведомлению
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response: NotificationResponse) => {
        console.log('Получен ответ на уведомление:', response); // Логируем ответ
        notificationResponse.current = response;
        handleNotificationNavigation(response);
      }
    );

    // Проверяем последнее уведомление при запуске приложения
    const checkNotification = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        console.log('Последнее уведомление:', response); // Логируем последнее уведомление
        notificationResponse.current = response;
        handleNotificationNavigation(response);
      }
    };

    checkNotification();

    return () => {
      subscription.remove();
    };
  }, []);


  /**
     * Обрабатывает переход по уведомлению
     * @param response - объект ответа на уведомление
     */
  const handleNotificationNavigation = async (response: NotificationResponse) => {
    const data = response.notification.request.content.data as unknown as NotificationData;
    console.log('Данные уведомления:', data); // Логируем данные

    if (data?.type === 'medication-reminder') {
      const user = await getLocalStorage('userDetail');
      if (!user || user.email !== data.userEmail) {
        console.log('Уведомление для другого пользователя:', data.userEmail);
        return;
      }

      // Добавляем задержку перед навигацией
      setTimeout(() => {
        router.navigate({
          pathname: '/action-modal',
          params: {
            docId: data.medId,
            selectedDate: data.date,
            reminder: data.reminderTime,
            name: data.medName,
            dose: data.medDose,
            when: data.medWhen,
          },
        });
      }, 500); // Задержка 500 мс (0.5 секунды)
    }
  };

  // JSX-разметка
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{
        headerShown: false,
        statusBarStyle: 'dark',

      }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen
          name="action-modal"
          options={{
            presentation: 'modal',
            gestureEnabled: false,
          }}
        />
      </Stack>
    </>
  );
}